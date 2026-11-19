// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "VelvetMotionApp",
    platforms: [
        .iOS(.v16)
    ],
    products: [
        .library(
            name: "VelvetMotionApp",
            targets: ["VelvetMotionApp"]
        )
    ],
    targets: [
        .target(
            name: "VelvetMotionApp",
            path: "VelvetMotionApp",
            exclude: ["Info.plist"]
        )
    ]
)
