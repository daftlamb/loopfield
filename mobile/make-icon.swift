import AppKit
let size=1024
let bitmap=NSBitmapImageRep(bitmapDataPlanes:nil,pixelsWide:size,pixelsHigh:size,bitsPerSample:8,samplesPerPixel:4,hasAlpha:true,isPlanar:false,colorSpaceName:.deviceRGB,bytesPerRow:0,bitsPerPixel:0)!
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current=NSGraphicsContext(bitmapImageRep:bitmap)
NSColor(calibratedRed:0.93,green:0.93,blue:0.92,alpha:1).setFill()
NSRect(x:0,y:0,width:size,height:size).fill()
let ink=NSColor(calibratedRed:0.14,green:0.15,blue:0.14,alpha:1)
// Two interlocking, quantized paths: an instrument icon made from its own step grid.
let cells=[[1,1,1,1,1,0,0,0],[1,0,0,0,1,0,0,0],[1,0,0,1,1,1,1,1],[1,0,0,1,0,0,0,1],[1,1,1,1,1,0,0,1],[0,0,0,1,0,0,0,1],[0,0,0,1,1,1,1,1]]
ink.setFill()
for (row,line) in cells.enumerated(){for (column,value) in line.enumerated() where value==1{NSRect(x:192+column*80,y:752-row*80,width:64,height:64).fill()}}
NSColor(calibratedRed:0.85,green:0.38,blue:0.20,alpha:1).setFill()
NSRect(x:512,y:432,width:64,height:64).fill()
NSGraphicsContext.restoreGraphicsState()
try bitmap.representation(using:.png,properties:[:])!.write(to:URL(fileURLWithPath:"ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png"))
