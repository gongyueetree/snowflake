"""Convert the referenced KiCad StepUp WRL's triangle geometry, retaining original units."""
import re,json,hashlib
from pathlib import Path
root=Path(__file__).resolve().parents[1];path=root/'dist/engineering/models/PinHeader_2x06_P2.54mm_Vertical.wrl';s=path.read_text()
assert 'Transform {' not in s,'Converter expects this model with baked geometry'
colors={name:list(map(float,rgb.split())) for name,rgb in re.findall(r'material DEF ([\w-]+) Material \{.*?diffuseColor ([\d. ]+)',s,re.S)}
meshes=[]
for inds,coords,mat in re.findall(r'Shape \{ geometry IndexedFaceSet\s*\{.*?coordIndex \[([^\]]+)\]\s*coord Coordinate \{ point \[([^\]]+)\].*?material USE ([\w-]+)',s,re.S):
 vertices=list(map(float,re.findall(r'-?\d+(?:\.\d+)?',coords)));indices=list(map(int,re.findall(r'-?\d+',inds)));faces=[];face=[]
 for v in indices:
  if v==-1:
   assert len(face)==3;faces+=face;face=[]
  else:face.append(v)
 assert max(faces)<len(vertices)//3
 meshes.append({'material':mat,'color':colors[mat],'positions':vertices,'indices':faces})
assert len(meshes)>20
out={'source':'https://github.com/KiCad/kicad-packages3D/blob/master/Connector_PinHeader_2.54mm.3dshapes/PinHeader_2x06_P2.54mm_Vertical.wrl','sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'unitsToMm':2.54,'license':'CC-BY-SA-4.0 with KiCad exception; Copyright 2017 kicad StepUp','meshes':meshes}
(root/'dist/engineering/models/j2-mesh.js').write_text('export const J2_MESH = '+json.dumps(out,separators=(',',':'))+';\n')
(root/'dist/engineering/models/LICENSE.txt').write_text('\n'.join(l[2:] for l in s.splitlines()[2:18])+'\nGeometry redistributed without shape modification; JSON is a format conversion.\n')
print(len(meshes),'mesh facesets;',sum(len(m['indices'])//3 for m in meshes),'triangles')
