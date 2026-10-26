"""Deterministic orthographic z-buffer preview of the actual CAD, no display/GPU required."""
import json,math
import numpy as np
from PIL import Image,ImageDraw,ImageFont
from build_enclosure import geometry,HERE,box

ROOT=HERE.parent
parts,data,coords=geometry();connectors=json.loads((HERE/'connector_meshes.json').read_text())

def shape_faces(s,col,shift=0):
    v,t=s.tessellate(.04,.15);v=np.array([p.toTuple() for p in v]);v[:,2]+=shift
    return [(v[np.array(t)],np.array(col))]

def hardware(shift):
    output=shape_faces(parts['pcb_reference'],[39,123,87],shift)
    for ms in connectors.values():
        for m in ms:
            v=np.array(m['positions']).reshape(-1,3);v[:,1]=16.5-v[:,1];v[:,2]+=5.6+shift
            output.append((v[np.array(m['indices']).reshape(-1,3)],np.array(m['color'])*255))
    for f in data['components']:
        if not f['pads'] or f['ref'].startswith('J'):continue
        x,y,a=f['at'];fx,fy,fX,fY=f['fabBounds'];h=1.2 if f['ref'].startswith('U') else .8
        s=box(fx,fX,fy,fY,0,h).rotate((0,0,0),(0,0,1),-a).translate((x-107,y-68.75,5.6)).mirror('XZ',(0,8.25,0))
        output+=shape_faces(s,[42,53,49] if f['ref'].startswith('U') else [185,165,120],shift)
    return output

def render(groups,w,h):
    view=np.array([-1.3,-1.7,1.55]);view/=np.linalg.norm(view)
    right=np.cross([0,0,1],view);right/=np.linalg.norm(right);up=np.cross(view,right)
    transform=np.stack([right,-up,view],axis=1)
    points=np.concatenate([t.reshape(-1,3) for t,c in groups])@transform
    lo=points[:,:2].min(0);hi=points[:,:2].max(0)
    scale=min((w-100)/(hi[0]-lo[0]),(h-100)/(hi[1]-lo[1]))
    off=np.array([w/2,h/2])-(lo+hi)/2*scale
    pix=np.full((h,w,3),[242,244,239],dtype=np.uint8);depth=np.full((h,w),-np.inf)
    light=np.array([-.4,-.5,.9]);light/=np.linalg.norm(light)
    for triangles,color in groups:
        ps=triangles@transform;ps[:,:,:2]=ps[:,:,:2]*scale+off
        normals=np.cross(triangles[:,1]-triangles[:,0],triangles[:,2]-triangles[:,0]);normals/=np.maximum(1e-12,np.linalg.norm(normals,axis=1))[:,None]
        shades=.48+.52*np.abs(normals@light)
        for p,shade in zip(ps,shades):
            x0=max(0,int(math.floor(p[:,0].min())));x1=min(w-1,int(math.ceil(p[:,0].max())))
            y0=max(0,int(math.floor(p[:,1].min())));y1=min(h-1,int(math.ceil(p[:,1].max())))
            if x0>x1 or y0>y1:continue
            a,b,c=p;den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1])
            if abs(den)<1e-10:continue
            yy,xx=np.mgrid[y0:y1+1,x0:x1+1];xx=xx+.5;yy=yy+.5
            u=((b[1]-c[1])*(xx-c[0])+(c[0]-b[0])*(yy-c[1]))/den
            v=((c[1]-a[1])*(xx-c[0])+(a[0]-c[0])*(yy-c[1]))/den;ww=1-u-v
            z=u*a[2]+v*b[2]+ww*c[2];dd=depth[y0:y1+1,x0:x1+1]
            mask=(u>=-1e-8)&(v>=-1e-8)&(ww>=-1e-8)&(z>dd)
            dd[mask]=z[mask];pix[y0:y1+1,x0:x1+1][mask]=np.clip(color*shade,0,255).astype(np.uint8)
    return Image.fromarray(pix)

base=shape_faces(parts['base'],[64,83,87]);lid=shape_faces(parts['lid'],[167,188,187])
assembled=render(base+hardware(0)+lid,1100,1000)
exploded=render(base+hardware(12)+shape_faces(parts['lid'],[167,188,187],27),1100,1000)
out=Image.new('RGB',(2200,1350),(242,244,239));out.paste(assembled,(0,180));out.paste(exploded,(1100,180));d=ImageDraw.Draw(out)
font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';bold='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
def txt(x,y,s,size=30,b=False):d.text((x,y),s,font=ImageFont.truetype(bold if b else font,size),fill='#294443')
txt(70,45,'LA_2040 / PRINTABLE ENCLOSURE',44,True)
txt(70,115,'Actual CAD geometry · PCB 35 × 16.5 × 1.6 mm · First fit prototype',27)
txt(70,1190,'ASSEMBLED',28,True);txt(1170,1190,'EXPLODED / PCB REFERENCE',28,True)
txt(70,1260,'Shell 38.4 × 25.7 × 11.2 mm  |  BOOT access + two LED windows  |  2 × M2 × 8 plastic screws',25)
out.save(ROOT/'docs'/'CAD_preview.png');print(ROOT/'docs'/'CAD_preview.png')
