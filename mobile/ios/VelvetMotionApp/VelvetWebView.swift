import SwiftUI
import WebKit

/// Hardware-accelerated WKWebView supporting iPhone, iPad (Split View & Stage Manager),
/// WebRTC live voice/camera calls, Three.js WebGL scenes, and Bitcoin wallet URI handoff.
struct VelvetWebView: UIViewRepresentable {
    let url: URL
    let reloadTrigger: UUID
    @Binding var isLoading: Bool
    @Binding var loadError: String?

    private let allowedHosts: Set<String> = [
        "velvetmotion-ai.vercel.app",
        "velvetmotionai.vercel.app",
        "ivory-sunset-mxq1s.firebaseapp.com",
        "accounts.google.com",
        "localhost"
    ]

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.allowsPictureInPictureMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.applicationNameForUserAgent = "VelvetMotioniOS/1.0"

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 7/255, green: 5/255, blue: 12/255, alpha: 1)
        webView.scrollView.backgroundColor = webView.backgroundColor

        let refreshControl = UIRefreshControl()
        refreshControl.tintColor = UIColor(red: 219/255, green: 39/255, blue: 119/255, alpha: 1)
        refreshControl.addTarget(
            context.coordinator,
            action: #selector(Coordinator.handleRefresh(_:)),
            for: .valueChanged
        )
        webView.scrollView.refreshControl = refreshControl

        context.coordinator.webView = webView
        webView.load(URLRequest(url: url))
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {
        if context.coordinator.lastReloadTrigger != reloadTrigger {
            context.coordinator.lastReloadTrigger = reloadTrigger
            uiView.load(URLRequest(url: url))
        }
    }

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        let parent: VelvetWebView
        weak var webView: WKWebView?
        var lastReloadTrigger: UUID

        init(_ parent: VelvetWebView) {
            self.parent = parent
            self.lastReloadTrigger = parent.reloadTrigger
        }

        @objc func handleRefresh(_ sender: UIRefreshControl) {
            webView?.reload()
            sender.endRefreshing()
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            DispatchQueue.main.async {
                self.parent.isLoading = false
                self.parent.loadError = nil
            }
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            DispatchQueue.main.async {
                self.parent.isLoading = false
                self.parent.loadError = error.localizedDescription
            }
        }

        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationAction: WKNavigationAction,
            decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
        ) {
            guard let targetURL = navigationAction.request.url else {
                decisionHandler(.allow)
                return
            }
            let scheme = targetURL.scheme?.lowercased() ?? ""
            if scheme == "bitcoin" || scheme == "mailto" || scheme == "tel" {
                UIApplication.shared.open(targetURL)
                decisionHandler(.cancel)
                return
            }
            if let host = targetURL.host?.lowercased(),
               !parent.allowedHosts.contains(host),
               navigationAction.navigationType == .linkActivated {
                UIApplication.shared.open(targetURL)
                decisionHandler(.cancel)
                return
            }
            decisionHandler(.allow)
        }

        @available(iOS 15.0, *)
        func webView(
            _ webView: WKWebView,
            requestMediaCapturePermissionFor origin: WKSecurityOrigin,
            initiatedByFrame frame: WKFrameInfo,
            type: WKMediaCaptureType,
            decisionHandler: @escaping (WKPermissionDecision) -> Void
        ) {
            if parent.allowedHosts.contains(origin.host.lowercased()) {
                decisionHandler(.grant)
            } else {
                decisionHandler(.prompt)
            }
        }
    }
}
