import {spawn} from 'node:child_process';
const args=process.argv.slice(2), forwarded=[];
for(let i=0;i<args.length;i++){
 if(args[i]==='--strictPort')continue;
 forwarded.push(args[i]==='--host'?'--hostname':args[i]);
}
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','dev',...forwarded],{stdio:'inherit'});
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>child.kill(signal));
child.on('exit',code=>process.exit(code??0));
