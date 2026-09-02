import Foundation
import AuthenticationServices
import Capacitor

/// Native "Sign in with Apple" implemented directly in the app target.
///
/// The community npm plugin targets Capacitor 7 and is skipped by `cap sync` on
/// Capacitor 8, so the JS side never found a native implementation and the
/// button appeared unresponsive. This plugin registers under the same name
/// ("SignInWithApple") and returns the same payload shape the web layer expects.
@objc(SignInWithApplePlugin)
public class SignInWithApplePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SignInWithApplePlugin"
    public let jsName = "SignInWithApple"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "authorize", returnType: CAPPluginReturnPromise)
    ]

    private var pendingCall: CAPPluginCall?

    @objc func authorize(_ call: CAPPluginCall) {
        pendingCall = call

        let request = ASAuthorizationAppleIDProvider().createRequest()
        var scopes: [ASAuthorization.Scope] = []
        let requested = (call.getString("scopes") ?? "email name").lowercased()
        if requested.contains("email") { scopes.append(.email) }
        if requested.contains("name") { scopes.append(.fullName) }
        request.requestedScopes = scopes
        if let nonce = call.getString("nonce") { request.nonce = nonce }

        DispatchQueue.main.async {
            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = self
            controller.presentationContextProvider = self
            controller.performRequests()
        }
    }
}

extension SignInWithApplePlugin: ASAuthorizationControllerDelegate {
    public func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithAuthorization authorization: ASAuthorization
    ) {
        guard
            let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
            let tokenData = credential.identityToken,
            let identityToken = String(data: tokenData, encoding: .utf8)
        else {
            pendingCall?.reject("Apple did not return an identity token.")
            pendingCall = nil
            return
        }

        var response: [String: Any] = [
            "identityToken": identityToken,
            "user": credential.user
        ]
        if let email = credential.email { response["email"] = email }
        if let given = credential.fullName?.givenName { response["givenName"] = given }
        if let family = credential.fullName?.familyName { response["familyName"] = family }
        if let codeData = credential.authorizationCode,
           let code = String(data: codeData, encoding: .utf8) {
            response["authorizationCode"] = code
        }

        pendingCall?.resolve(["response": response])
        pendingCall = nil
    }

    public func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithError error: Error
    ) {
        let nsError = error as NSError
        if nsError.code == ASAuthorizationError.canceled.rawValue {
            pendingCall?.reject("The user canceled the authorization attempt.", "1001")
        } else {
            pendingCall?.reject(error.localizedDescription, String(nsError.code))
        }
        pendingCall = nil
    }
}

extension SignInWithApplePlugin: ASAuthorizationControllerPresentationContextProviding {
    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        // iPad requires a valid anchor window, otherwise the sheet never appears.
        if let window = bridge?.viewController?.view.window {
            return window
        }
        let scene = UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .first { $0.activationState == .foregroundActive }
        return scene?.windows.first(where: { $0.isKeyWindow }) ?? scene?.windows.first ?? UIWindow()
    }
}
