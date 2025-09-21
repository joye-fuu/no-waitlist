//
//  AuthManager.swift
//  No Waitlist
//
//  Created by GitHub Copilot on 21/9/2025.
//

//import Foundation
//import FirebaseAuth
//import FirebaseFirestore
//
//@MainActor
//class AuthManager: ObservableObject {
//    @Published var isAuthenticated = false
//    @Published var currentUserID: String?
//    
//    private var auth = Auth.auth()
//    
//    init() {
//        // Listen for authentication state changes
//        auth.addStateDidChangeListener { [weak self] _, user in
//            Task { @MainActor in
//                self?.isAuthenticated = user != nil
//                self?.currentUserID = user?.uid
//            }
//        }
//        
//        // Sign in anonymously if not already signed in
//        signInAnonymously()
//    }
//    
//    func signInAnonymously() {
//        guard auth.currentUser == nil else {
//            // Already signed in
//            isAuthenticated = true
//            currentUserID = auth.currentUser?.uid
//            return
//        }
//        
//        auth.signInAnonymously { [weak self] result, error in
//            if let error = error {
//                print("Anonymous sign-in failed: \(error.localizedDescription)")
//                return
//            }
//            
//            Task { @MainActor in
//                self?.isAuthenticated = true
//                self?.currentUserID = result?.user.uid
//                print("Anonymous sign-in successful: \(result?.user.uid ?? "Unknown")")
//            }
//        }
//    }
//    
//    func getCurrentUserID() -> String? {
//        return auth.currentUser?.uid
//    }
//}
