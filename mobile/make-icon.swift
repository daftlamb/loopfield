import AppKit
import ImageIO
// Package the pixel wordmark as an opaque 1024 px App Store icon.
let source = URL(fileURLWithPath: "mobile/icon-source.png")
let provider = CGImageSourceCreateWithURL(source as CFURL, nil)!
let image = CGImageSourceCreateImageAtIndex(provider, 0, nil)!
let size = 1024
let context = CGContext(data: nil, width: size, height: size, bitsPerComponent: 8,
    bytesPerRow: size * 4, space: CGColorSpace(name: CGColorSpace.sRGB)!,
    bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
context.interpolationQuality = .none
context.draw(image, in: CGRect(x: 0, y: 0, width: size, height: size))
let destination = URL(fileURLWithPath: "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png")
let output = CGImageDestinationCreateWithURL(destination as CFURL, "public.png" as CFString, 1, nil)!
CGImageDestinationAddImage(output, context.makeImage()!, nil)
precondition(CGImageDestinationFinalize(output), "Could not write app icon")
