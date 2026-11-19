import SwiftUI

/// VelvetMotion AI — Universal Apple iPhone & iPad SwiftUI Application
@main
struct VelvetMotionApp: App {
    @State private var isLoading = true
    @State private var loadError: String?
    @State private var reloadTrigger = UUID()

    private let appURL = URL(string: "https://velvetmotion-ai.vercel.app")!

    var body: some Scene {
        WindowGroup {
            ZStack {
                Color(red: 7/255, green: 5/255, blue: 12/255)
                    .ignoresSafeArea()

                VelvetWebView(
                    url: appURL,
                    reloadTrigger: reloadTrigger,
                    isLoading: $isLoading,
                    loadError: $loadError
                )
                .ignoresSafeArea(edges: .bottom)

                if isLoading {
                    VStack(spacing: 14) {
                        ProgressView()
                            .tint(Color(red: 219/255, green: 39/255, blue: 119/255))
                            .scaleEffect(1.3)
                        Text("VelvetMotion AI")
                            .font(.title3.bold())
                            .foregroundColor(.white)
                    }
                    .padding(24)
                    .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 20))
                }

                if let errorText = loadError {
                    VStack(spacing: 16) {
                        Text("Connection Interrupted")
                            .font(.headline)
                            .foregroundColor(.white)
                        Text(errorText)
                            .font(.footnote)
                            .foregroundColor(.gray)
                            .multilineTextAlignment(.center)
                        Button("Retry") {
                            loadError = nil
                            isLoading = true
                            reloadTrigger = UUID()
                        }
                        .padding(.horizontal, 24)
                        .padding(.vertical, 10)
                        .background(Color(red: 219/255, green: 39/255, blue: 119/255))
                        .foregroundColor(.white)
                        .clipShape(Capsule())
                    }
                    .padding(28)
                    .background(Color(red: 18/255, green: 14/255, blue: 22/255))
                    .clipShape(RoundedRectangle(cornerRadius: 24))
                    .padding()
                }
            }
            .preferredColorScheme(.dark)
        }
    }
}
