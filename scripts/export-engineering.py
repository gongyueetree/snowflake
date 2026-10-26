"""Deterministic, read-only KiCad 9 preview exporter. No editing or connectivity inference."""
import sys,json,math,re,hashlib,html,zipfile,shutil
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from extract_hardware import parse,child,val
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'dist/engineering';OUT.mkdir(exist_ok=True)
SRC=Path(sys.argv[1])
esc=lambda s:html.escape(str(s),quote=True)
def num(n,k,default=0):
 v=val(n,k);return float(v[0]) if v else default
def pt(n,k):return list(map(float,val(n,k)[:2]))
def at(n):return list(map(float,val(n,'at'))) or [0,0,0]
def elems(n):return [a for a in n if isinstance(a,list) and a]
def polypts(n):return [list(map(float,a[1:3])) for a in child(next(iter(child(n,'pts')),[]),'xy')]
def arcpts(a,b,c,steps=24):
 ax,ay=a;bx,by=b;cx,cy=c;d=2*(ax*(by-cy)+bx*(cy-ay)+cx*(ay-by))
 if abs(d)<1e-9:return [a,b,c]
 ux=((ax*ax+ay*ay)*(by-cy)+(bx*bx+by*by)*(cy-ay)+(cx*cx+cy*cy)*(ay-by))/d
 uy=((ax*ax+ay*ay)*(cx-bx)+(bx*bx+by*by)*(ax-cx)+(cx*cx+cy*cy)*(bx-ax))/d
 aa,bb,cc=[math.atan2(y-uy,x-ux) for x,y in (a,b,c)];s=(cc-aa)%(2*math.pi)
 if (bb-aa)%(2*math.pi)>s:s-=2*math.pi
 r=math.hypot(ax-ux,ay-uy)
 return [[ux+r*math.cos(aa+s*i/steps),uy+r*math.sin(aa+s*i/steps)] for i in range(steps+1)]
def shapes(n,prefix):
 out=[]
 for e in elems(n):
  if not e[0].startswith(prefix):continue
  t=e[0][len(prefix):];lay=val(e,'layer');l=lay[0] if lay else ''
  w=num(e,'width',num(next(iter(child(e,'stroke')),[]),'width',.12))
  if t in ('line','rect','circle','arc'):
   d={'type':t,'layer':l,'width':w}
   for k in ['start','end','mid','center']:
    if val(e,k):d[k]=pt(e,k)
   out.append(d)
  elif t=='poly':out.append({'type':'poly','layer':l,'width':w,'points':polypts(e),'fill':val(e,'fill')==['solid']})
 return out

def geomsvg(s):
 t=s['type']; w=s.get('width',.15);attr=f' stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round" fill="none"'
 if t=='line':return f'<path d="M{s["start"][0]} {s["start"][1]}L{s["end"][0]} {s["end"][1]}"{attr}/>'
 if t=='rect':
  a,b=s['start'],s['end'];return f'<rect x="{min(a[0],b[0])}" y="{min(a[1],b[1])}" width="{abs(a[0]-b[0])}" height="{abs(a[1]-b[1])}"{attr}/>'
 if t=='circle':
  a,b=s.get('center',s.get('start')),s['end'];return f'<circle cx="{a[0]}" cy="{a[1]}" r="{math.dist(a,b)}"{attr}/>'
 if t=='arc':ps=arcpts(s['start'],s['mid'],s['end'])
 else:ps=s['points']
 p=' '.join(f'{x},{y}' for x,y in ps)
 return f'<polyline points="{p}"{attr}/>' if not s.get('fill') else f'<polygon points="{p}" stroke-width="{w}"/>'

def exportboard(key,path):
 n=parse(path.read_text());fps=[];graphics=shapes(n,'gr_');nets={v[1]:v[2] for v in child(n,'net')}
 for f in child(n,'footprint'):
  props={v[1]:v[2] for v in child(f,'property')};fa=at(f);fa+= [0]*(3-len(fa));pads=[]; texts=[]
  for p in child(f,'pad'):
   pa=at(p);pa+=[fa[2]]*(3-len(pa));sz=pt(p,'size');dr=val(p,'drill');dr=[float(v) for v in dr if re.match(r'^\d',v)]
   pads.append({'number':p[1],'type':p[2],'shape':p[3],'at':pa,'size':sz,'drill':dr,'layers':val(p,'layers'),'net':val(p,'net')[1] if len(val(p,'net'))>1 else ''})
  for p in child(f,'property'):
   if p[1] not in ('Reference','Value'):continue
   ef=next(iter(child(p,'effects')),[])
   if val(p,'hide')==['yes'] or val(ef,'hide')==['yes'] or 'hide' in ef:continue
   texts.append({'text':p[2],'at':at(p),'size':num(next(iter(child(ef,'font')),[]),'size',1),'layer':(val(p,'layer') or ['F.SilkS'])[0]})
  gs=shapes(f,'fp_');fab=[s for s in gs if s['layer'].endswith('.Fab')]
  xy=[s[k] for s in fab for k in ['start','end','center'] if k in s]+[p for s in fab for p in s.get('points',[])]
  bounds=[min(p[0] for p in xy),min(p[1] for p in xy),max(p[0] for p in xy),max(p[1] for p in xy)] if xy else [-1,-1,1,1]
  models=[{'path':m[1],'hidden':val(m,'hide')==['yes'],'offset':list(map(float,val(next(iter(child(m,'offset')),[]),'xyz'))) or [0,0,0],'rotation':list(map(float,val(next(iter(child(m,'rotate')),[]),'xyz'))) or [0,0,0],'scale':list(map(float,val(next(iter(child(m,'scale')),[]),'xyz'))) or [1,1,1]} for m in child(f,'model')]
  fps.append({'models':models,'ref':props.get('Reference',''),'value':props.get('Value',''),'footprint':f[1],'at':fa,'side':val(f,'layer')[0][0],'pads':pads,'graphics':gs,'texts':texts,'fabBounds':bounds})
 seg=[{'start':pt(s,'start'),'end':pt(s,'end'),'width':num(s,'width'), 'layer':val(s,'layer')[0],'net':nets.get(str(int(num(s,'net'))),'')} for s in child(n,'segment')]
 vias=[{'at':pt(s,'at'),'size':num(s,'size'),'drill':num(s,'drill'),'net':nets.get(str(int(num(s,'net'))),'')} for s in child(n,'via')]
 zones=[]
 for z in child(n,'zone'):
  for p in child(z,'filled_polygon'):zones.append({'layer':val(p,'layer')[0],'points':polypts(p)})
 edges=[s for s in graphics if s['layer']=='Edge.Cuts']; chains=[]
 for s in edges:chains.append(arcpts(s['start'],s['mid'],s['end']) if s['type']=='arc' else [s['start'],s['end']])
 loop=chains.pop(0)
 while chains:
  for i,p in enumerate(chains):
   if math.dist(loop[-1],p[0])<.002:loop+=p[1:];chains.pop(i);break
   if math.dist(loop[-1],p[-1])<.002:loop+=list(reversed(p))[1:];chains.pop(i);break
  else:raise ValueError('Outline is not continuous')
 assert math.dist(loop[0],loop[-1])<.002
 for t in child(n,'gr_text'):
  ef=next(iter(child(t,'effects')),[])
  graphics.append({'type':'text','text':t[1],'at':at(t),'size':num(next(iter(child(ef,'font')),[]),'size',1),'layer':val(t,'layer')[0]})
 bounds=[min(p[0] for p in loop),min(p[1] for p in loop),max(p[0] for p in loop),max(p[1] for p in loop)]
 d={'id':key,'name':'Snowflake 37' if key=='snowflake' else 'LA RP2040','file':path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'thickness':num(child(n,'general')[0],'thickness',1.6),'bounds':bounds,'outline':loop,'components':fps,'tracks':seg,'vias':vias,'zones':zones,'graphics':graphics,'nets':nets}
 (OUT/(key+'.json')).write_text(json.dumps(d,separators=(',',':')))
 for side in ['F','B']:pcbsvg(d,side,OUT/(key+'-'+side+'.svg'))
 return d

def textsvg(text,pos,size=1,angle=0,anchor='middle',color=None):
 x,y=pos[:2]; col=f' fill="{color}"' if color else ''
 lines=str(text).split('\n');return f'<text x="{x}" y="{y}" font-size="{size}" text-anchor="{anchor}" dominant-baseline="middle" transform="rotate({angle} {x} {y})" stroke="none"{col}>'+''.join(f'<tspan x="{x}" dy="{0 if i==0 else size*1.3}">{esc(v)}</tspan>' for i,v in enumerate(lines))+'</text>'
def pcbsvg(d,side,path):
 x,y,X,Y=d['bounds'];m=3;vb=f'{x-m} {y-m} {X-x+2*m} {Y-y+2*m}';out=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" font-family="Arial,sans-serif">',f'<title>{d["name"]} {side} — extracted KiCad PCB</title>'];poly=' '.join(f'{a},{b}' for a,b in d['outline'])
 out+=[f'<g id="substrate"><polygon points="{poly}" fill="#164e3b" stroke="#aebd95" stroke-width=".15"/></g>']
 out+=['<g id="copper" fill="#44845d" stroke="#62a478">']
 for z in d['zones']:
  if z['layer']==side+'.Cu':out.append('<polygon points="'+' '.join(f'{a},{b}' for a,b in z['points'])+'" stroke="none" fill="#286648"/>')
 for s in d['tracks']:
  if s['layer']==side+'.Cu':out.append(geomsvg({'type':'line',**s}))
 out+=['</g><g id="pads" fill="#d5b977" stroke="#d5b977">']
 for f in d['components']:
  a=f['at'];out.append(f'<g transform="translate({a[0]} {a[1]}) rotate({-a[2]})">')
  for p in f['pads']:
   if side+'.Cu' not in p['layers'] and '*.Cu' not in p['layers']:continue
   px,py,pa=p['at'];w,h=p['size'];r=min(w,h)/2 if p['shape'] in ('circle','oval') else .12 if p['shape']=='roundrect' else 0
   out.append(f'<rect x="{px-w/2}" y="{py-h/2}" width="{w}" height="{h}" rx="{r}" stroke="none" transform="rotate({a[2]-pa} {px} {py})"/>')
  out.append('</g>')
 for v in d['vias']:out.append(f'<circle cx="{v["at"][0]}" cy="{v["at"][1]}" r="{v["size"]/2}" stroke="none"/>')
 out+=['</g><g id="silk" fill="#edf0d6" stroke="#edf0d6">']
 for s in d['graphics']:
  if s['layer']!=side+'.SilkS':continue
  out.append(textsvg(s['text'],s['at'],s['size'],-(s['at'][2] if len(s['at'])>2 else 0)) if s['type']=='text' else geomsvg(s))
 for f in d['components']:
  a=f['at'];out.append(f'<g transform="translate({a[0]} {a[1]}) rotate({-a[2]})">')
  for s in f['graphics']:
   if s['layer']==side+'.SilkS':out.append(geomsvg(s))
  for t in f['texts']:
   if t['layer']==side+'.SilkS':out.append(textsvg(t['text'],t['at'],t['size'],a[2]-(t['at'][2] if len(t['at'])>2 else a[2])))
  out.append('</g>')
 out+=['</g><g id="holes" fill="#0e1720">']
 for v in d['vias']:out.append(f'<circle cx="{v["at"][0]}" cy="{v["at"][1]}" r="{v["drill"]/2}"/>')
 for f in d['components']:
  a=f['at'];out.append(f'<g transform="translate({a[0]} {a[1]}) rotate({-a[2]})">')
  for p in f['pads']:
   if p['drill']:out.append(f'<circle cx="{p["at"][0]}" cy="{p["at"][1]}" r="{p["drill"][0]/2}"/>')
  out.append('</g>')
 out+=['</g></svg>'];path.write_text(''.join(out))

def schematic(key,path):
 n=parse(path.read_text());libs={s[1]:s for s in child(child(n,'lib_symbols')[0],'symbol')};out=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 297 210" font-family="Arial,sans-serif"><rect width="297" height="210" fill="#fffdf7"/><g stroke="#1c7451" stroke-width=".18" fill="none">']
 for w in child(n,'wire'):out.append(geomsvg({'type':'poly','points':polypts(w),'width':.18}))
 out+=['</g>']
 for j in child(n,'junction'):
  x,y=pt(j,'at');out.append(f'<circle cx="{x}" cy="{y}" r=".4" fill="#1c7451"/>')
 for s in child(n,'symbol'):
  name=val(s,'lib_id')[0];lib=libs[name];sa=at(s);sa+=[0]*(3-len(sa));a=math.radians(sa[2]);co,si=math.cos(a),math.sin(a);mirror=val(s,'mirror');unit=int(num(s,'unit',1))
  def tr(p):
   x,y=p
   if mirror==['x']:y=-y
   if mirror==['y']:x=-x
   return [sa[0]+co*x-si*y,sa[1]-si*x-co*y]
  for sy in child(lib,'symbol'):
   if int(sy[1].split('_')[-2]) not in [0,unit]:continue
   for e in elems(sy):
    t=e[0];fill=val(next(iter(child(e,'fill')),[]),'type');color='#fff3cf' if fill==['background'] else '#7a3030' if fill==['outline'] else 'none';sw=num(next(iter(child(e,'stroke')),[]),'width',.2) or .2
    if t in ('rectangle','polyline','circle','arc'):
     if t=='rectangle':
      (x,y),(xx,yy)=pt(e,'start'),pt(e,'end');ps=[tr(p) for p in [[x,y],[xx,y],[xx,yy],[x,yy],[x,y]]]
     elif t=='polyline':ps=[tr(p) for p in polypts(e)]
     elif t=='arc':ps=[tr(p) for p in arcpts(pt(e,'start'),pt(e,'mid'),pt(e,'end'))]
     else:
      c=tr(pt(e,'center'));r=num(e,'radius');out.append(f'<circle cx="{c[0]}" cy="{c[1]}" r="{r}" fill="{color}" stroke="#7a3030" stroke-width="{sw}"/>');continue
     out.append('<polyline points="'+' '.join(f'{x},{y}' for x,y in ps)+f'" stroke="#7a3030" stroke-width="{sw}" fill="{color}"/>')
    elif t=='pin':
     if 'hide' in e or val(e,'hide')==['yes']:continue
     pa=at(e);ang=math.radians(pa[2]);le=num(e,'length');p=tr(pa[:2]);q=tr([pa[0]+le*math.cos(ang),pa[1]+le*math.sin(ang)])
     out.append('<g stroke="#7a3030">'+geomsvg({'type':'line','start':p,'end':q,'width':.15})+'</g>')
     number=val(e,'number')[0];nn=val(e,'name')[0];dx=q[0]-p[0];dy=q[1]-p[1];vertical=abs(dy)>abs(dx)
     mp=[(p[0]+q[0])/2+(.65 if vertical else 0),(p[1]+q[1])/2-(0 if vertical else .6)]
     out.append(textsvg(number,mp,.85,0,'middle','#8c3e3e'))
     pin_names=next(iter(child(lib,'pin_names')),[]);hidden=val(pin_names,'hide')==['yes'] or 'hide' in pin_names
     if nn not in ['~',''] and not hidden:
      off=num(pin_names,'offset',.6);pos=[q[0]+(dx/le*off if le else 0),q[1]+(dy/le*off if le else 0)];out.append(textsvg(nn,pos,.9,-90 if vertical else 0,'start' if (dy<0 if vertical else dx>0) else 'end','#216666'))
    elif t=='text':out.append(textsvg(e[1],tr(at(e)[:2]),1,0,'middle','#7a3030'))
  for p in child(s,'property'):
   if p[1] not in ['Reference','Value']:continue
   ef=next(iter(child(p,'effects')),[])
   if val(p,'hide')==['yes'] or val(ef,'hide')==['yes'] or 'hide' in ef:continue
   pa=at(p);font=next(iter(child(ef,'font')),[]);ang=pa[2] if len(pa)>2 else 0;anchor='start' if 'left' in val(ef,'justify') else 'end' if 'right' in val(ef,'justify') else 'middle'
   out.append(textsvg(p[2],pa,num(font,'size',1.27),-ang,anchor,'#164e66'))
 for t in child(n,'label')+child(n,'text'):
  a=at(t);ef=next(iter(child(t,'effects')),[]);out.append(textsvg(t[1],a,num(next(iter(child(ef,'font')),[]),'size',1.27),-(a[2] if len(a)>2 else 0),'start','#1c7451'))
 for t in child(n,'no_connect'):
  x,y=pt(t,'at');out.append(f'<path d="M{x-.4} {y-.4}l.8 .8m-.8 0l.8 -.8" stroke="#3960a0" stroke-width=".15"/>')
 title=next(iter(child(n,'title_block')),[]);out.append('<rect x="5" y="5" width="287" height="200" fill="none" stroke="#a4a49b" stroke-width=".2"/>')
 out.append(textsvg((val(title,'title') or [path.name])[0],[290,198],2,0,'end','#334844'));out.append(textsvg('KiCad source preview · '+path.name,[290,202],1.2,0,'end','#697d76'));out.append('</svg>')
 (OUT/(key+'-schematic.svg')).write_text(''.join(out))
 return {'symbols':len(child(n,'symbol')),'wires':len(child(n,'wire')),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}

manifest=[]
for key,folder,base in [('rp2040','LA_RP2040/LA_RP2040','LA_rp2040'),('snowflake','SnowFlake/SnowFlake','snowflake')]:
 p=SRC/folder;d=exportboard(key,p/(base+'.kicad_pcb'));sch=schematic(key,p/(base+'.kicad_sch'))
 with zipfile.ZipFile(OUT/(key+'-kicad.zip'),'w',zipfile.ZIP_DEFLATED) as z:
  for f in p.iterdir():
   if f.suffix in ['.kicad_pcb','.kicad_sch','.kicad_pro','.kicad_sym','.lib'] or f.name=='sym-lib-table':z.write(f,arcname=base+'/'+f.name)
 manifest.append({'id':key,'pcb':{'sha256':d['sha256'],'components':len(d['components']),'tracks':len(d['tracks']),'vias':len(d['vias'])},'schematic':sch})
(OUT/'provenance.json').write_text(json.dumps(manifest,indent=2));print(json.dumps(manifest,indent=2))
