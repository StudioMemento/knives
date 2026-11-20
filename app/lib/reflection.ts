import {DoubleSide, MeshBasicMaterial} from 'three';
import {RAIL} from './choreography.ts';

// Visible light is confined to the strip where the reflected surface meets the floor.
// Both passes use the live mesh transform and the same lens, including during inspection.
export function contactMaterial(projectionPixels: {value:number}) {
 const material = new MeshBasicMaterial({
  color:'#adadad', transparent:true, opacity:.28, side:DoubleSide, forceSinglePass:true,
  depthTest:true, depthWrite:true,
 });
 material.onBeforeCompile = shader => {
  shader.uniforms.uFloorY = {value:RAIL.floorY};
  shader.uniforms.uProjectionPixels = projectionPixels;
  shader.vertexShader = 'varying float vMirrorY;\n' + shader.vertexShader.replace(
   '#include <project_vertex>', '#include <project_vertex>\n vMirrorY = (modelMatrix * vec4(transformed, 1.)).y;'
  );
  shader.fragmentShader = 'varying float vMirrorY; uniform float uFloorY, uProjectionPixels;\n' + shader.fragmentShader.replace(
   '#include <opaque_fragment>', `
    float below = uFloorY - vMirrorY;
    // With a locked camera looking along -Z, this is the separation of the real
    // and mirrored points in CSS pixels, independent of DPR and render-target size.
    float separation = below * uProjectionPixels * gl_FragCoord.w;
    if (separation < 0. || separation > 18.) discard;
    diffuseColor.a *= 1. - smoothstep(2., 18., separation);
    #include <opaque_fragment>`
  );
 };
 return material;
}
