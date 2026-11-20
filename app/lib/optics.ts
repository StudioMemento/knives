import {PerspectiveCamera, Vector3} from 'three';
import {RAIL} from './choreography.ts';

// The nearest point of the annular emitter is the bottom edge of its projected ellipse.
export function alignStageCamera(camera:PerspectiveCamera, width:number, height:number, ringLine:number) {
 camera.clearViewOffset();
 camera.aspect=width/height;
 camera.updateProjectionMatrix();
 camera.updateMatrixWorld();
 const rim = new Vector3(0, RAIL.floorY, RAIL.centerZ + RAIL.radius).project(camera);
 const shift = (1 - rim.y) / 2 - ringLine;
 camera.setViewOffset(width,height,0,shift*height,width,height);
 return shift;
}

const screenPoint = new Vector3();

// Optical enlargement about a fixed point in the base shot. Near/far and the camera transform stay fixed.
export function focusLens(lens:PerspectiveCamera, base:PerspectiveCamera, anchor:Vector3, zoom:number) {
 screenPoint.copy(anchor).project(base);
 const matrix = lens.projectionMatrix.copy(base.projectionMatrix).elements;
 matrix[0] *= zoom;
 matrix[5] *= zoom;
 matrix[8] = zoom * matrix[8] + (zoom - 1) * screenPoint.x;
 matrix[9] = zoom * matrix[9] + (zoom - 1) * screenPoint.y;
 lens.projectionMatrixInverse.copy(lens.projectionMatrix).invert();
}
