// Positions are expressed in the assembled stock, so a chart seam or a folded pose cannot turn the grain.
export const surfaceHeader = `
varying vec3 vStock;
uniform sampler2D finishCurvature;
uniform sampler2D timberNormal;
uniform vec3 finishTint;
uniform float microKind, microStrength, microSeed, grainMix, volumeStyle, curvatureStrength;
float hashStock(vec3 p) {
 p=fract(p*.1031); p+=dot(p,p.yzx+33.33); return fract((p.x+p.y)*p.z);
}
float stockNoise(vec3 p) {
 vec3 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
 return mix(mix(mix(hashStock(i),hashStock(i+vec3(1,0,0)),f.x),
                mix(hashStock(i+vec3(0,1,0)),hashStock(i+vec3(1,1,0)),f.x),f.y),
            mix(mix(hashStock(i+vec3(0,0,1)),hashStock(i+vec3(1,0,1)),f.x),
                mix(hashStock(i+vec3(0,1,1)),hashStock(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float filteredStock(vec3 coord) {
 vec3 footprint=fwidth(coord);
 return (stockNoise(coord)-.5)*(1.-smoothstep(.38,1.55,max(max(footprint.x,footprint.y),footprint.z)));
}
float microHeight(vec3 p,float polish) {
 p+=vec3(microSeed,0.,0.);
 float lathe=filteredStock(vec3(p.x*.70,p.y*16.+p.z*6.2,p.z*4.-p.y*2.7));
 float rubbed=filteredStock(vec3(p.x*.24,p.y*5.4+p.z*2.,p.z*1.6));
 float stipple=filteredStock(p*8.6)+.40*filteredStock(p*19.2);
 float h;
 if(microKind<.5)h=.66*lathe+.34*rubbed;
 else if(microKind<1.5)h=stipple;
 else if(microKind<2.5)h=.42*lathe+.58*filteredStock(vec3(p.x*11.+p.y*8.,p.y*.94,p.z*4.3));
 else if(microKind<3.5)h=.65*filteredStock(vec3(p.x*1.7,p.y*13.+p.z*3.,p.z*4.1))+.23*lathe;
 else h=.34*stipple+.15*rubbed;
 return mix(h*microStrength,lathe*.0023,polish);
}
vec3 microNormal(vec3 surf,vec3 n,float h) {
 vec3 dpdx=dFdx(surf),dpdy=dFdy(surf),sx=dFdx(vStock),sy=dFdy(vStock);
 float scale=sqrt((dot(dpdx,dpdx)+dot(dpdy,dpdy))/max(dot(sx,sx)+dot(sy,sy),1.e-12));
 vec3 r1=cross(dpdy,n),r2=cross(n,dpdx);float determinant=dot(dpdx,r1);
 vec3 gradient=scale*(dFdx(h)*r1+dFdy(h)*r2);
 return normalize(n-clamp(sign(determinant)/max(abs(determinant),1.e-10)*gradient,vec3(-.25),vec3(.25)));
}
`;

export const microFinishes = {
 HYPER:{blade:[0,0,1,1,0,0],handle:[1,4,0,1,1,2],metals:[0,4,1,0,1,2]},
 VERTEX:{blade:[4,0,1,0,0,1],handle:[4,1,0,0,1,2],metals:[0,4,0,1,0,1]},
 EDGE:{blade:[0,1,1,1,0,0],handle:[1,1,0,1,2,4],metals:[0,0,1,1,2,4]},
 TRIS:{blade:[0,0,0,4,1,0],handle:[3,3,3,3,3,3],metals:[4,0,4,2,4,0]},
 QUAD:{blade:[0,0,4,0,1,1],handle:[3,3,3,3,3,3],metals:[0,4,0,0,1,4]},
} as const;
