"""Infer a photo's relative depth locally; no images are uploaded."""
import sys, json, time, struct, argparse
from pathlib import Path
parser=argparse.ArgumentParser(description='Generate relative depth for the photo preview; not a calibrated scan.')
parser.add_argument('--model-repo',type=Path,required=True,help='Local clone of DepthAnything/Depth-Anything-V2')
parser.add_argument('--checkpoint',type=Path,required=True,help='Official Small/vits checkpoint')
parser.add_argument('--photos',type=Path,default=Path('public/photos'))
parser.add_argument('--output',type=Path,default=Path('public/depth'))
parser.add_argument('names',nargs='*',default=['house','courtyard','terrace','lane','village'])
args=parser.parse_args()
sys.path.insert(0,str(args.model_repo.resolve()))
import numpy as np
import cv2
import torch
from depth_anything_v2.dpt import DepthAnythingV2

torch.set_num_threads(4)
model=DepthAnythingV2(encoder='vits',features=64,out_channels=[48,96,192,384])
model.load_state_dict(torch.load(args.checkpoint,map_location='cpu',weights_only=True))
model.eval()
source=args.photos
target=args.output
target.mkdir(exist_ok=True,parents=True)
names=args.names
for name in names:
 started=time.time()
 frame=cv2.imread(str(source/(name+'.jpg')))
 if frame is None: raise RuntimeError('Missing photo: '+name)
 with torch.inference_mode():
  depth=model.infer_image(frame,input_size=518)
 near=np.percentile(depth,99.5);far=np.percentile(depth,.5)
 disparity=np.clip((depth-far)/max(near-far,1e-6),0,1)
 h,w=frame.shape[:2]
 width=640 if w>=h else round(640*w/h)
 height=round(width*h/w)
 grid=cv2.resize(disparity,(width,height),interpolation=cv2.INTER_AREA)
 raw=(np.clip(grid,0,1)*65535).astype('<u2')
 with (target/(name+'.depth')).open('wb') as stream:
  stream.write(b'RVD1'+struct.pack('<HH',width,height));stream.write(raw.tobytes())
 meta={'name':name,'width':w,'height':h,'depthWidth':width,'depthHeight':height,'method':'Depth Anything V2 Small','geometry':'AI-estimated relative depth, not a measured scan','seconds':round(time.time()-started,2),'p5':float(np.percentile(grid,5)),'p50':float(np.median(grid)),'p95':float(np.percentile(grid,95))}
 (target/(name+'.json')).write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf-8')
 print(json.dumps(meta),flush=True)
