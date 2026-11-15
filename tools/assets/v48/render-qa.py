"""Reproducible CPU-only glTF visual evidence. Does not modify shipping assets."""
import bpy, sys, os, math
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:]
source, output, kind=args
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.abspath(source))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
clip=[o for o in meshes if '__clip__' in o.name][0]
if kind=='clip':
    for o in meshes: o.hide_render=o!=clip
    subjects=[clip]
else: subjects=meshes
for obj in meshes:
    for slot in obj.material_slots:
        mat=slot.material
        if not mat: continue
        mat.use_nodes=True
        bsdf=mat.node_tree.nodes.get('Principled BSDF')
        handle='HANDLE' in mat.name
        bsdf.inputs['Base Color'].default_value=(.07,.075,.08,1) if handle else (.5,.53,.55,1)
        bsdf.inputs['Metallic'].default_value=.8
        bsdf.inputs['Roughness'].default_value=.28
points=[o.matrix_world@Vector(v) for o in subjects for v in o.bound_box]
minp=Vector([min(p[a] for p in points) for a in range(3)])
maxp=Vector([max(p[a] for p in points) for a in range(3)])
centre=(minp+maxp)/2
cam_data=bpy.data.cameras.new('QA camera');cam=bpy.data.objects.new('QA camera',cam_data);bpy.context.collection.objects.link(cam)
# glTF +Z clip face maps to Blender -Y.
direction=Vector((0,-1,.04 if kind=='clip' else .18)).normalized()
cam.location=centre+direction*.6;cam.rotation_euler=(centre-cam.location).to_track_quat('-Z','Y').to_euler()
cam_data.type='ORTHO';cam_data.ortho_scale=(maxp.x-minp.x)*1.12
bpy.context.scene.camera=cam
for name,offset,power,size in [('Key',(-.07,-.16,.17),18,.13),('Edge',(.1,.07,.12),13,.10),('Soft',(.03,-.12,-.08),6,.08)]:
    ld=bpy.data.lights.new(name,'AREA');lo=bpy.data.objects.new(name,ld);bpy.context.collection.objects.link(lo);lo.location=centre+Vector(offset);lo.rotation_euler=(centre-lo.location).to_track_quat('-Z','Y').to_euler();ld.energy=power;ld.shape='DISK';ld.size=size
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=64;scene.cycles.use_denoising=False
scene.world=bpy.data.worlds.new('Studio');scene.world.use_nodes=True;scene.world.node_tree.nodes.get('Background').inputs[0].default_value=(.1,.1,.1,1);scene.world.node_tree.nodes.get('Background').inputs[1].default_value=.35
scene.render.resolution_x=1200;scene.render.resolution_y=480 if kind=='clip' else 600;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.filepath=os.path.abspath(output)
scene.render.film_transparent=False
scene.view_settings.view_transform='AgX'
bpy.ops.render.render(write_still=True)
