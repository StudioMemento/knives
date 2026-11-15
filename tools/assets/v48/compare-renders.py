from PIL import Image
import numpy as np
import json
from pathlib import Path
p=Path(__file__).parent/'qa'
a=np.asarray(Image.open(p/'overall-before.png').convert('RGB')).astype(float)
b=np.asarray(Image.open(p/'overall-after.png').convert('RGB')).astype(float)
d=np.abs(a-b)
metrics={
    'clipPixelsIdentical': Image.open(p/'clip-before.png').convert('RGBA').tobytes()==Image.open(p/'clip-after.png').convert('RGBA').tobytes(),
    'overallMeanAbsoluteRGB255':float(d.mean()),
    'overallChangedPixelsPct':float(np.mean(np.max(d,axis=2)>0)*100),
    'overallPixelsDeltaAbove10Pct':float(np.mean(np.max(d,axis=2)>10)*100),
    'renderEngine':'Blender Cycles CPU, 64 samples, no denoising',
    'resolutionOverall':[1200,600],
    'resolutionClip':[1200,480],
    'note':'Same camera/materials/light/seed. CPU render is asset evidence, not a live-browser performance measurement.'
}
assert metrics['clipPixelsIdentical'], 'Protected clip visual changed'
assert metrics['overallMeanAbsoluteRGB255']<.01, 'Unexpected overall render difference'
(p/'render-comparison.json').write_text(json.dumps(metrics,indent=2)+'\n')
print(json.dumps(metrics,indent=2))
