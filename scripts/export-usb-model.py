"""Convert the referenced KiCad StepUp WRL's triangle geometry, retaining original units."""
import re,json,hashlib
from pathlib import Path
root=Path(__file__).resolve().parents[1];path=root/'dist/engineering/models/USB_C_Receptacle_GCT_USB4105-xx-A_16P_TopMnt_Horizontal.wrl';s=path.read_text()
assert 'Transform {' not in s,'Converter expects this model with baked geometry'
colors={name:list(map(float,rgb.split())) for name,rgb in re.findall(r'material DEF ([\w-]+) Material \{.*?diffuseColor ([\d. ]+)',s,re.S)}
meshes=[]
for inds,coords,mat in re.findall(r'Shape \{ geometry IndexedFaceSet\s*\{.*?coordIndex \[([^\]]+)\]\s*coord Coordinate \{ point \[([^\]]+)\].*?material USE ([\w-]+)',s,re.S):
 vertices=list(map(float,re.findall(r'[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?',coords)));indices=list(map(int,re.findall(r'-?\d+',inds)));faces=[];face=[]
 for v in indices:
  if v==-1:
   assert len(face)==3;faces+=face;face=[]
  else:face.append(v)
 assert len(vertices)%3==0
 assert max(faces)<len(vertices)//3
 meshes.append({'material':mat,'color':colors[mat],'positions':vertices,'indices':faces})
assert len(meshes)>20
out={'source':'https://gitlab.com/kicad/libraries/kicad-packages3D/-/blob/8.0.9/Connector_USB.3dshapes/USB_C_Receptacle_GCT_USB4105-xx-A_16P_TopMnt_Horizontal.wrl','sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'unitsToMm':2.54,'license':'CC-BY-SA-4.0 with KiCad exception; KiCad library contributors','meshes':meshes}
(root/'dist/engineering/models/usb-mesh.js').write_text('export const USB_MESH = '+json.dumps(out,separators=(',',':'))+';\n')
print(len(meshes),'mesh facesets;',sum(len(m['indices'])//3 for m in meshes),'triangles')
