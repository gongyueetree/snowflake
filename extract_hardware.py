import re,json,pathlib,sys,hashlib

def parse(s):
 tokens=re.findall(r'"(?:\\.|[^"\\])*"|[()]|[^\s()]+',s);stack=[];root=[];cur=root
 for v in tokens:
  if v=='(': n=[];cur.append(n);stack.append(cur);cur=n
  elif v==')': cur=stack.pop()
  else: cur.append(json.loads(v) if v.startswith('"') else v)
 return root[0]
def child(n,k):return [v for v in n if isinstance(v,list) and v and v[0]==k]
def val(n,k):return next((v[1:] for v in child(n,k)),[])
if __name__=='__main__':
 n=parse(pathlib.Path(sys.argv[1]).read_text());edges=[]
 for e in n:
  if isinstance(e,list) and e[0] in ['gr_line','gr_arc'] and val(e,'layer')==['Edge.Cuts']:
   edges.append({k:[round(float(v[0])-150,6),round(float(v[1])-90,6)] for k in ['start','mid','end'] if (v:=val(e,k))})
 # The submitted outline is made from straight line segments; chain endpoints.
 assert all('mid' not in e for e in edges)
 rest=edges[:];loop=[rest.pop(0)['start']]
 # Start with the actual first segment, preserving both endpoints.
 loop=[edges[0]['start'],edges[0]['end']]
 while rest:
  at=loop[-1];found=False
  for i,e in enumerate(rest):
   for a,b in [('start','end'),('end','start')]:
    if sum((at[j]-e[a][j])**2 for j in range(2))<1e-6:
     loop.append(e[b]);rest.pop(i);found=True;break
   if found:break
  if not found: raise ValueError('Disconnected outline')
 assert sum((loop[0][j]-loop[-1][j])**2 for j in range(2))<1e-6
 with open(sys.argv[2],'a') as f:f.write('export const OUTLINE = '+json.dumps(loop)+';\n')
 print('Extracted closed PCB outline:',len(edges),'segments')
