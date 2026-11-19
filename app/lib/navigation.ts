export function nearestChapter(target:number,index:number){
 const current=((target%5)+5)%5;
 return Math.round(target+((index-current+7.5)%5)-2.5);
}
