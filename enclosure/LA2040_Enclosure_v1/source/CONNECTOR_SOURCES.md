# Connector reference meshes

The coordinates in connector_meshes.json are KiCad XY minus (107, 68.75); Z is relative to PCB top. The verification and renderer then convert Y to 16.5 - Y, preserving physical handedness.

J1: KiCad 8.0.9 USB_C_Receptacle_GCT_USB4105-xx-A_16P_TopMnt_Horizontal.wrl
https://gitlab.com/kicad/libraries/kicad-packages3D/-/blob/8.0.9/Connector_USB.3dshapes/USB_C_Receptacle_GCT_USB4105-xx-A_16P_TopMnt_Horizontal.wrl
Project offset: [0,-1.25,0] mm, model rotation [0,0,0], footprint rotation -90 degrees.

J2: KiCad PinHeader_2x06_P2.54mm_Vertical.wrl
https://github.com/KiCad/kicad-packages3D/blob/master/Connector_PinHeader_2.54mm.3dshapes/PinHeader_2x06_P2.54mm_Vertical.wrl
Project offset: [3,-6.3,-2.5] mm, model rotation [-180,90,0]. WRL model coordinates converted with 2.54 mm per unit and KiCad's T Rz(-z) Ry(-y) Rx(-x) S convention.

Models are reference data, not printable enclosure parts. Distributed under CC-BY-SA-4.0 with the KiCad exception; see licenses/. JSON is a coordinate/format conversion of the source geometry.
