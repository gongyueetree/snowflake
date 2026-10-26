"""Verify exported meshes, sample real connector clearance, and render exact CAD geometry."""
from pathlib import Path
import json,math,struct,collections,zipfile,xml.etree.ElementTree as ET,subprocess,sys
import numpy as np
import cadquery as cq
from build_enclosure import geometry,P,HERE
from OCP.BRepClass3d import BRepClass3d_SolidClassifier
from OCP.gp import gp_Pnt
from OCP.TopAbs import TopAbs_IN

ROOT=HERE.parent

def read_stl(path):
    raw=path.read_bytes();n=struct.unpack_from('<I',raw,80)[0];assert len(raw)==84+50*n
    tris=np.array([struct.unpack_from('<12fH',raw,84+i*50)[3:12] for i in range(n)]).reshape(-1,3,3)
    return tris

def mesh_check(tris):
    pts=np.round(tris.reshape(-1,3),5);vertices,inverse=np.unique(pts,axis=0,return_inverse=True);faces=inverse.reshape(-1,3)
    edges=collections.Counter();directed=collections.Counter()
    adj=collections.defaultdict(set)
    for t in faces:
        for a,b in zip(t,np.roll(t,-1)):
            edges[tuple(sorted((int(a),int(b))))]+=1;directed[(int(a),int(b))]+=1
            adj[int(a)].add(int(b));adj[int(b)].add(int(a))
    nonmanifold=sum(n!=2 for n in edges.values())
    inconsistent=sum(directed[(a,b)]!=directed[(b,a)] for a,b in edges)
    volume=float(np.einsum('ij,ij->i',tris[:,0],np.cross(tris[:,1],tris[:,2])).sum()/6)
    unseen=set(adj);components=0
    while unseen:
        components+=1;todo=[unseen.pop()]
        while todo:
            for v in adj[todo.pop()]:
                if v in unseen:unseen.remove(v);todo.append(v)
    assert nonmanifold==0 and inconsistent==0 and volume>0
    area=np.linalg.norm(np.cross(tris[:,1]-tris[:,0],tris[:,2]-tris[:,0]),axis=1)/2
    assert np.min(area)>1e-10
    return {'triangles':len(tris),'vertices':len(vertices),'nonmanifold_edges':nonmanifold,'inconsistent_edges':inconsistent,'connected_components':components,'volume_mm3':volume,'bounds_mm':[pts.min(0).tolist(),pts.max(0).tolist()]}

def export_3mf(meshes,path):
    ns='http://schemas.microsoft.com/3dmanufacturing/core/2015/02';ET.register_namespace('',ns)
    root=ET.Element('model',{'unit':'millimeter','xml:lang':'en-US','xmlns':ns});res=ET.SubElement(root,'resources');build=ET.SubElement(root,'build')
    for i,(name,tris,tx) in enumerate(meshes,1):
        vertices,inds=np.unique(np.round(tris.reshape(-1,3),6),axis=0,return_inverse=True)
        obj=ET.SubElement(res,'object',{'id':str(i),'type':'model','name':name});mesh=ET.SubElement(obj,'mesh');vs=ET.SubElement(mesh,'vertices');ts=ET.SubElement(mesh,'triangles')
        for v in vertices:ET.SubElement(vs,'vertex',{k:f'{x:.6f}' for k,x in zip('xyz',v)})
        for tri in inds.reshape(-1,3):ET.SubElement(ts,'triangle',{f'v{j+1}':str(v) for j,v in enumerate(tri)})
        ET.SubElement(build,'item',{'objectid':str(i),'transform':f'1 0 0 0 1 0 0 0 1 {tx} 0 0'})
    content='''<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>'''
    rel='''<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>'''
    with zipfile.ZipFile(path,'w',zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml',content);z.writestr('_rels/.rels',rel);z.writestr('3D/3dmodel.model',ET.tostring(root,encoding='utf-8',xml_declaration=True))
    # Structural readback, without implying printer-specific settings are supplied.
    with zipfile.ZipFile(path) as z:
        tree=ET.fromstring(z.read('3D/3dmodel.model'));assert len(tree.findall('.//{'+ns+'}item'))==len(meshes)

def main():
    parts,data,coords=geometry();report=json.loads((ROOT/'docs/geometry_report.json').read_text())
    report['stl']={};meshes={}
    for path in sorted((ROOT/'STL').glob('*.stl')):
        meshes[path.stem]=read_stl(path);report['stl'][path.name]=mesh_check(meshes[path.stem])
        expected=2 if path.stem=='Base_and_Lid_PRINT' else 1
        assert report['stl'][path.name]['connected_components']==expected
        assert abs(report['stl'][path.name]['bounds_mm'][0][2])<.0001
    export_3mf([('Base',meshes['Base_PRINT'],0),('Lid',meshes['Lid_PRINT'],46.4)],ROOT/'LA2040_Print_Plate.3mf')
    connector=json.loads((HERE/'connector_meshes.json').read_text())
    report['connector_sampling']={};pcbtop=P['pcb_bottom']+P['pcb_thickness']
    for ref,items in connector.items():
        samples=[]
        for m in items:
            pts=np.array(m['positions']).reshape(-1,3);pts[:,1]=16.5-pts[:,1];pts[:,2]+=pcbtop;faces=np.array(m['indices']).reshape(-1,3);tri=pts[faces]
            samples.extend([pts,tri.mean(1),(tri[:,0]+tri[:,1])/2,(tri[:,1]+tri[:,2])/2,(tri[:,2]+tri[:,0])/2])
        samples=np.unique(np.round(np.concatenate(samples),6),axis=0)
        result={}
        for name in ['base','lid']:
            cls=BRepClass3d_SolidClassifier(parts[name].wrapped);hits=[]
            for v in samples:
                cls.Perform(gp_Pnt(*map(float,v)),1e-5)
                if cls.State()==TopAbs_IN:hits.append(v.tolist())
            result[name]={'interior_sample_hits':len(hits),'example_hits':hits[:5]}
        report['connector_sampling'][ref]={'sample_count':len(samples),'result':result}
        assert not any(r['interior_sample_hits'] for r in result.values()),(ref,result)
    # Conservative parameterised component-body envelope checks (not certified part heights).
    report['component_envelopes']={}
    for f in data['components']:
        if not f['pads'] or f['ref'].startswith('J'):continue
        x,y,a=f['at'];fx,fy,fX,fY=f['fabBounds'];r=math.radians(a);co,si=math.cos(r),math.sin(r)
        pts=[(x+u*co+v*si-107,85.25-(y-u*si+v*co)) for u,v in [(fx-.15,fy-.15),(fX+.15,fy-.15),(fX+.15,fY+.15),(fx-.15,fY+.15)]]
        h=2.0 if f['ref'].startswith(('U','SW')) else 1.5
        env=cq.Workplane('XY').polyline(pts).close().extrude(h).translate((0,0,pcbtop)).val()
        overlaps={k:env.intersect(parts[k]).Volume() for k in ['base','lid']}
        report['component_envelopes'][f['ref']]={'assumed_height_mm':h,'xy_expansion_mm':.15,'overlaps_mm3':overlaps}
        assert all(v<1e-6 for v in overlaps.values()),(f['ref'],overlaps)
    # Confirm asymmetric access holes have not been mirrored relative to the physical PCB.
    cls=BRepClass3d_SolidClassifier(parts['lid'].wrapped);report['handedness_and_feature_holes']={}
    for ref in ['SW4','D5','D1']:
        x,y=coords[ref];cls.Perform(gp_Pnt(x,y,P['height']-.5),1e-6)
        clear=cls.State()!=TopAbs_IN;assert clear
        report['handedness_and_feature_holes'][ref]={'center':[x,y],'hole_clear':clear}
    x,y=coords['SW4'];cls.Perform(gp_Pnt(x,16.5-y,P['height']-.5),1e-6);assert cls.State()==TopAbs_IN
    report['handedness_and_feature_holes']['boot_mirror_rejection']=True
    report['step_readback']={}
    for path in (ROOT/'STEP').glob('*.step'):
        obj=cq.importers.importStep(str(path)).val();assert obj.isValid()
        report['step_readback'][path.name]={'valid':True,'solids':len(obj.Solids())}
    report['verification_limit']='BRep and triangle-mesh tests plus connector vertex/edge-midpoint/triangle-centroid sampling. Other component heights are conservative assumptions. No physical test print or measured USB confirmation.'
    (ROOT/'docs/verification.json').write_text(json.dumps(report,indent=2))
    subprocess.run([sys.executable,str(HERE/'render_software.py')],check=True)
    print(json.dumps({'stl':report['stl'],'connectors':report['connector_sampling'],'component_envelopes_checked':len(report['component_envelopes'])},indent=2))

if __name__=='__main__':main()
