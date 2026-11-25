"""Install a flattened Painter export for one colour/finish pair, including both web resolutions."""
import argparse,json,re,tempfile,os
from pathlib import Path
import numpy as np
from PIL import Image
def install(project,source,model,zone,color,style):
    root=Path(project).resolve();src=Path(source);k=model.upper();s=zone.lower()
    def opt(x,p):
        t=str(x).upper()
        if not re.fullmatch(p+r'?\d{1,2}',t):raise ValueError('Invalid option '+t)
        return int(t.removeprefix(p))
    c,n=opt(color,'C'),opt(style,'S')
    catalogue=json.loads((root/'app/lib/catalogue-data.json').read_text())
    entry=catalogue[k][s]
    if not (1<=c<=len(entry['colors']) and 1<=n<=len(entry['styles'])):raise ValueError('Unknown colour/finish')
    C,S=f'C{c:02d}',f'S{n:02d}'
    def rgb(name):
        with Image.open(src/(name+'.png')) as im:return im.convert('RGB')
    images={'BaseColor':rgb('BaseColor'),'NormalGL':rgb('NormalGL')}
    if (src/'ORM.png').exists():images['ORM']=rgb('ORM')
    else:
        channels=[]
        for ch in ['AO','Roughness','Metallic']:
            with Image.open(src/(ch+'.png')) as im:channels.append(im.convert('L'))
        images['ORM']=Image.merge('RGB',channels)
    optflags={}
    for name,key in [('Optics','optics'),('Anisotropy','direction')]:
        if (src/(name+'.png')).exists():images[name]=rgb(name);optflags[key]=True
    if any(im.width!=im.height for im in images.values()):raise ValueError('V71 uses square UV atlases')
    output=root/'public/pbr'/k.lower()/s/'overrides'/(C+'_'+S);output.mkdir(exist_ok=True,parents=True)
    # Prepare the complete pair first. The catalogue registration is the final atomic write.
    with tempfile.TemporaryDirectory(dir=output) as temp:
        stage=Path(temp)
        for level,target in [('lo',256),('web',2048 if k=='HYPER' and s=='blade' and n==7 else 1024)]:
            (stage/level).mkdir()
            for channel,im in images.items():
                res=min(im.width,target);scaled=im.resize((res,res),Image.Resampling.LANCZOS)
                if channel=='NormalGL':
                    arr=np.asarray(scaled,dtype='f')/127.5-1
                    arr/=np.maximum(np.linalg.norm(arr,axis=2,keepdims=True),1e-8)
                    scaled=Image.fromarray(np.rint(np.clip(.5+.5*arr,0,1)*255).astype('u1'))
                scaled.save(stage/level/(channel+'.webp'),format='WEBP',lossless=channel!='BaseColor',quality=91,method=2)
        for item in stage.glob('*/*'):
            dest=output/item.relative_to(stage);dest.parent.mkdir(exist_ok=True);os.replace(item,dest)
    manifest=root/'app/lib/pbr-overrides.json';reg=json.loads(manifest.read_text())
    reg['/'.join((k,s,C,S))]=optflags
    with tempfile.NamedTemporaryFile(mode='w',encoding='utf-8',dir=manifest.parent,delete=False) as handle:
        json.dump(reg,handle,indent=2);handle.write('\n');name=handle.name
    os.replace(name,manifest);print('Registered',k,s,C,S)
if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--project',default=Path(__file__).resolve().parents[2])
    for key in ['source','model','zone','color','style']:p.add_argument('--'+key,required=True)
    a=p.parse_args();install(a.project,a.source,a.model,a.zone,a.color,a.style)
