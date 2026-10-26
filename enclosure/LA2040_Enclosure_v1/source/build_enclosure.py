"""LA_2040 enclosure, millimetres. CadQuery 2.7.0.

Final CAD X = KiCad X - 107; CAD Y = 85.25 - KiCad Y.
The intermediate construction uses KiCad-down Y, then reflects the solids
before engraving/export so the printed lid is NOT left/right handed incorrectly.
PCB bottom is Z=4.0, top Z=5.6. Connector mesh Z is relative to PCB top.
Run: python source/build_enclosure.py [--output OUTPUT_DIRECTORY]
Print-oriented STLs are separate from assembly-coordinate STEP files.
"""
from pathlib import Path
import argparse, json, math, hashlib
import cadquery as cq

HERE = Path(__file__).resolve().parent
P = {
    "pcb_length":35.0, "pcb_width":16.5, "pcb_thickness":1.6,
    "pcb_xy_clearance":0.30, "pcb_bottom":4.0,
    "outer_x_min":-2.2, "outer_x_max":36.2,
    "outer_y_min":-4.6, "outer_y_max":21.1,
    "outer_radius":2.0, "floor":1.4, "seam_z":6.4,
    "height":11.2, "roof":1.4,
    "screw_x":17.5, "screw_y":[-2.45,18.95],
    "screw_pilot_diameter":1.7, "screw_clearance_diameter":2.3,
    "pilot_bottom":2.4,
    "usb_cut_y":[2.15,14.35], "usb_cut_z":[4.1,10.3],
    "header_cut_y":[-0.3,16.8], "header_cut_z":[1.45,7.5],
    "boot_access_diameter":3.2, "led_window_diameter":2.4,
    "lid_retainer_gap":0.20,
    "text_depth":0.28,
}

def box(x0,x1,y0,y1,z0,z1):
    return cq.Workplane('XY').box(x1-x0,y1-y0,z1-z0,centered=(False,False,False)).translate((x0,y0,z0)).val()

def rounded(x0,x1,y0,y1,z0,z1,r):
    return cq.Workplane('XY').box(x1-x0,y1-y0,z1-z0,centered=(False,False,False)).edges('|Z').fillet(r).translate((x0,y0,z0)).val()

def cyl(x,y,z0,z1,d):
    return cq.Solid.makeCylinder(d/2,z1-z0,cq.Vector(x,y,z0))

def clean(s): return s.clean()

def geometry():
    data=json.loads((HERE/'board_data.json').read_text())
    assert data['bounds']==[107,68.75,142,85.25] and data['thickness']==P['pcb_thickness']
    coords={f['ref']:(f['at'][0]-107,f['at'][1]-68.75) for f in data['components']}
    ox0,ox1,oy0,oy1=P['outer_x_min'],P['outer_x_max'],P['outer_y_min'],P['outer_y_max']
    seam,top=P['seam_z'],P['height']; pcbtop=P['pcb_bottom']+P['pcb_thickness']
    c=P['pcb_xy_clearance']
    base=rounded(ox0,ox1,oy0,oy1,0,seam,P['outer_radius'])
    cavity=rounded(-c,35+c,-c,16.5+c,P['floor'],top+1,.4)
    base=base.cut(cavity)
    lid=rounded(ox0,ox1,oy0,oy1,seam,top,P['outer_radius'])
    lid=lid.cut(rounded(-c,35+c,-c,16.5+c,seam-.1,top-P['roof'],.4))
    # Open-end connector reliefs. The broad USB aperture also admits many cable mouldings.
    uy0,uy1=P['usb_cut_y'];uz0,uz1=P['usb_cut_z']
    usb=box(ox0-1,6.7,uy0,uy1,uz0,uz1)
    hy0,hy1=P['header_cut_y'];hz0,hz1=P['header_cut_z']
    header=box(29.5,ox1+1,hy0,hy1,hz0,hz1)
    for cut in [usb,header]: base=base.cut(cut);lid=lid.cut(cut)
    # Solid PCB-underface rails; remain clear of the straddling J2 at X>=30 mm.
    for y0,y1 in [(-c,.70),(15.8,16.5+c)]:
        base=base.fuse(box(6.6,28.4,y0,y1,P['floor']-.01,P['pcb_bottom']))
    # Positive axial stops at the two unpopulated rear corners (0.15 mm X play).
    # They do not enter the 12 pins' mating envelope; intended for individual Dupont leads.
    for y0,y1 in [(-c-.05,.30),(16.20,16.5+c+.05)]:
        base=base.fuse(box(35.15,ox1,y0,y1,P['pcb_bottom']-.5,pcbtop+.20))
    # Two broad lid retainers above bare PCB edge areas, without drilling the board.
    for y0,y1 in [(-c-.02,.65),(15.85,16.5+c+.02)]:
        lid=lid.fuse(box(18.0,20.4,y0,y1,seam,top-P['roof']+.01))
        ly0,ly1=(y0+.27,y1) if y0<0 else (y0,y1-.27)
        lid=lid.fuse(box(18.0,20.4,ly0,ly1,pcbtop+P['lid_retainer_gap'],seam+.01))
    # Four keyed guide ribs and 0.25 mm clearance pockets, outside the PCB chamber.
    for x0,x1 in [(4.0,11.0),(24.0,31.0)]:
        for y0 in [-1.90,17.10]:
            base=base.cut(box(x0,x1,y0,y0+1.30,seam-.9,seam+.05))
            lid=lid.fuse(box(x0+.25,x1-.25,y0+.25,y0+1.05,seam-.65,seam+.01))
    # M2 x 8 mm pan-head thread-forming screws: 3.2 mm nominal base engagement.
    for y in P['screw_y']:
        base=base.cut(cyl(P['screw_x'],y,P['pilot_bottom'],seam+.2,P['screw_pilot_diameter']))
        lid=lid.cut(cyl(P['screw_x'],y,seam-1,top+1,P['screw_clearance_diameter']))
    # No assumed switch travel: direct BOOT access hole, plus light windows on the actual LEDs.
    for ref,d in [('SW4',P['boot_access_diameter']),('D5',P['led_window_diameter']),('D1',P['led_window_diameter'])]:
        x,y=coords[ref];lid=lid.cut(cyl(x,y,seam-.1,top+1,d))
    base,lid=clean(base),clean(lid)
    outline=[(x-107,y-68.75) for x,y in data['outline'][:-1]]
    pcb=cq.Workplane('XY').polyline(outline).close().extrude(P['pcb_thickness']).translate((0,0,P['pcb_bottom'])).val()
    # Convert KiCad screen-down Y to a right-handed top-view CAD coordinate system.
    base=base.mirror('XZ',(0,8.25,0));lid=lid.mirror('XZ',(0,8.25,0));pcb=pcb.mirror('XZ',(0,8.25,0))
    coords={ref:(x,16.5-y) for ref,(x,y) in coords.items()}
    # Engrave AFTER reflection, so the wordmark remains readable from outside.
    text=cq.Workplane('XY').text('LA_2040',2.5,P['text_depth']+.03,font='DejaVu Sans',kind='bold',halign='center',valign='center',combine=False).val()
    lid=clean(lid.cut(text.translate((19.75,8.25,top-P['text_depth']))))
    # Small closed front fit gauge, made from the actual shell geometry, not a separate guess.
    collar=clean(base.fuse(lid).intersect(box(ox0-.1,7.0,oy0-.1,oy1+.1,-.1,top+.1)))
    return {'base':base,'lid':lid,'fit_collar':collar,'pcb_reference':pcb},data,coords

def on_bed(shape,rotation=None):
    if rotation:shape=shape.rotate((0,0,0),rotation[0],rotation[1])
    bb=shape.BoundingBox();return shape.translate((-bb.xmin,-bb.ymin,-bb.zmin))

def main():
    args=argparse.ArgumentParser();args.add_argument('--output',default=str(HERE.parent));out=Path(args.parse_args().output)
    for d in ['STL','STEP','docs']: (out/d).mkdir(parents=True,exist_ok=True)
    parts,data,coords=geometry()
    oriented={'Base_PRINT':on_bed(parts['base']),
              'Lid_PRINT':on_bed(parts['lid'],((1,0,0),180)),
              'USB_Fit_Collar_PRINT':on_bed(parts['fit_collar'],((0,1,0),-90))}
    report={'units':'mm','parameters':P,'board_bounds_kicad':data['bounds'],'feature_centers_xy':{r:coords[r] for r in ['J1','J2','SW4','D5','D1']},'parts':{}}
    for name,s in parts.items():
        assert s.isValid(),f'{name}: invalid BRep'
        assert len(s.Solids())==1,f'{name}: not a single connected solid'
        cq.exporters.export(s,str(out/'STEP'/f'{name}.step'))
        b=s.BoundingBox();report['parts'][name]={'valid':s.isValid(),'solids':len(s.Solids()),'volume_mm3':s.Volume(),'size_mm':[b.xlen,b.ylen,b.zlen]}
    for name,s in oriented.items():
        cq.exporters.export(s,str(out/'STL'/f'{name}.stl'),tolerance=.025,angularTolerance=.10)
    b=oriented['Base_PRINT'];l=oriented['Lid_PRINT'].translate((b.BoundingBox().xlen+8,0,0))
    cq.exporters.export(cq.Compound.makeCompound([b,l]),str(out/'STL'/'Base_and_Lid_PRINT.stl'),tolerance=.025,angularTolerance=.10)
    asm=cq.Assembly(name='LA2040_enclosure')
    asm.add(parts['base'],name='base',color=cq.Color(.15,.17,.18))
    asm.add(parts['lid'],name='lid',color=cq.Color(.45,.48,.50,.5))
    asm.add(parts['pcb_reference'],name='PCB_REFERENCE_NOT_FOR_PRINT',color=cq.Color(.12,.4,.26))
    asm.export(str(out/'STEP'/'assembly_with_PCB_reference.step'))
    report['intersections_mm3']={
        'base_lid':parts['base'].intersect(parts['lid']).Volume(),
        'base_pcb':parts['base'].intersect(parts['pcb_reference']).Volume(),
        'lid_pcb':parts['lid'].intersect(parts['pcb_reference']).Volume()}
    assert all(v<1e-6 for v in report['intersections_mm3'].values()),report['intersections_mm3']
    (out/'docs'/'geometry_report.json').write_text(json.dumps(report,indent=2))
    print(json.dumps(report,indent=2))

if __name__=='__main__':main()
