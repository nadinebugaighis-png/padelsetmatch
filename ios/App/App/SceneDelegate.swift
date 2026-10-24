import UIKit
import Capacitor
import WebKit
import Security

/// Restore the auth session before the website's auth client starts, without
/// changing the integration-managed JavaScript client or browser storage.
class PersistentBridgeViewController: CAPBridgeViewController, WKScriptMessageHandler {
    private let authKey = "sb-wmebassrvhmkixseoige-auth-token"
    private let service = "com.moorisharches.padelsetmatch.auth"

    private var keychainQuery: [String: Any] {
        [kSecClass as String: kSecClassGenericPassword,
         kSecAttrService as String: service,
         kSecAttrAccount as String: authKey]
    }

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        guard let controller = webView?.configuration.userContentController else { return }
        controller.add(self, name: "nativeAuthStorage")
        var query = keychainQuery
        query[kSecReturnData as String] = true
        var result: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        let saved = status == errSecSuccess ? (result as? Data).flatMap { String(data: $0, encoding: .utf8) } : nil
        guard let json = try? JSONSerialization.data(withJSONObject: [authKey, saved as Any? ?? NSNull()]),
              let args = String(data: json, encoding: .utf8) else { return }
        let script = """
        (() => {
          if (window !== window.top || location.origin !== 'https://padelsetmatch.com') return;
          const [key, saved] = \(args);
          const set = Storage.prototype.setItem;
          const remove = Storage.prototype.removeItem;
          const clear = Storage.prototype.clear;
          const persist = value => window.webkit.messageHandlers.nativeAuthStorage.postMessage({key, value});
          try {
            if (saved !== null) set.call(localStorage, key, saved);
            else { const existing = localStorage.getItem(key); if (existing) persist(existing); }
          } catch (_) {}
          Storage.prototype.setItem = function(k, v) {
            const value = String(v);
            set.call(this, k, value);
            if (this === localStorage && k === key) persist(value);
          };
          Storage.prototype.removeItem = function(k) {
            remove.call(this, k);
            if (this === localStorage && k === key) persist(null);
          };
          Storage.prototype.clear = function() {
            clear.call(this);
            if (this === localStorage) persist(null);
          };
        })();
        """
        controller.addUserScript(WKUserScript(source: script, injectionTime: .atDocumentStart, forMainFrameOnly: true))
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        let origin = message.frameInfo.securityOrigin
        guard message.frameInfo.isMainFrame, origin.protocol == "https", origin.host == "padelsetmatch.com",
              let body = message.body as? [String: Any], body["key"] as? String == authKey else { return }
        if body["value"] is NSNull {
            SecItemDelete(keychainQuery as CFDictionary)
            return
        }
        guard let value = body["value"] as? String, let data = value.data(using: .utf8) else { return }
        let updates = [kSecValueData as String: data]
        if SecItemUpdate(keychainQuery as CFDictionary, updates as CFDictionary) == errSecItemNotFound {
            var query = keychainQuery
            query[kSecValueData as String] = data
            query[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
            SecItemAdd(query as CFDictionary, nil)
        }
    }
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = PersistentBridgeViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
