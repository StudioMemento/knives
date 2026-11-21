import type {Metadata,Viewport} from 'next';
import '@fontsource/michroma/400.css';
import './globals.css';
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover'};
export const metadata:Metadata={title:'MEMENTO — Knives Continuum',description:'Explore five folding knives in the Memento 3D showroom. Choose a style and color for the blade, handle and metal details.'};
// An asset/network failure can happen before React mounts. Keep recovery outside
// the app bundle so a failed entry chunk cannot leave an indefinite loading screen.
const startup=`(()=>{
 const root=document.documentElement;root.dataset.startup='script';
 addEventListener('error',event=>{if(event.target instanceof HTMLScriptElement&&event.target.src)root.dataset.scriptFailure=new URL(event.target.src).pathname.split('/').pop();else if(event.message)root.dataset.startupError=event.message.slice(0,160);},true);
 addEventListener('unhandledrejection',event=>{root.dataset.startupError=String(event.reason?.message||event.reason).slice(0,160);});
 setTimeout(()=>{
  if(document.querySelector('canvas.stage')?.dataset.boot)return;
  const notice=document.getElementById('startup-recovery');if(notice)notice.hidden=false;
 },20000);
})();`;
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:startup}}/></head><body>{children}<div id="startup-recovery" className="startup-recovery" role="alert" hidden><p>Loading was interrupted.</p><a href="/">Reload the showroom</a></div></body></html>;}
