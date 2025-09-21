//
//  ContentView.swift
//  No Waitlist
//
//  Created by Joye Fu on 20/9/2025.
//

import SwiftUI
import SwiftData

struct ContentView: View {
//    @EnvironmentObject var authManager: AuthManager
//    @StateObject private var firebaseService = FirebaseService()

    var body: some View {
        
//        if !authManager.isAuthenticated {
//            // Show loading state while authenticating
//            ProgressView("Setting up...")
//                .frame(maxWidth: .infinity, maxHeight: .infinity)
//        } else {
//            // Show main app content
//            mainContent
//        }
        
        mainContent
    }
    
    private var mainContent: some View {
    ScrollView {
        VStack(spacing: 0) {
                Course(code: "COMP4920")
                ClassBookmark(name: "W11A Tutorial", enrolments: 24, capacity: 24)
                ClassBookmark(name: "W11B Tutorial", enrolments: 20, capacity: 24)
                Course(code: "COMP3511")
                ClassBookmark(name: "W11A Tutorial", enrolments: 24, capacity: 24)
                ClassBookmark(name: "W11B Tutorial", enrolments: 20, capacity: 24)
            }
        }.safeAreaInset(edge: .top) {
            WaitlistHeader()
                .background(Color.white)
        }.safeAreaInset(edge: .bottom) {
            AddClass()
                .background(Color.white)
        }
    }
}

struct WaitlistHeader: View {
    
    var body: some View {
            Text("Waitlist")
                .font(Font.title)
                .fontWeight(Font.Weight.semibold)
                .padding(15)
            HStack {
                Spacer()
                Button {
                    // todo click on system
                } label: {
                    Image(systemName: "gearshape.fill")
                }
                .padding(.trailing, 15)
            }
        }
}

struct Course: View {
    
    let code: String
    
    var body: some View {
        HStack{
            Text(code)
                .font(Font.title2)
                .fontWeight(Font.Weight.semibold)
                .padding(15)
            Spacer()
        }
        .background(Color.gray)
    }
}

struct ClassBookmark: View {
    
    let name: String
    let enrolments: Int
    let capacity: Int
    
        
    var statusColor: Color {
        if enrolments < capacity {
            return Color.green
        } else {
            return Color.red
        }
    }
    
    var body: some View {
        Divider()
            .overlay(Color.gray.frame(height: 1))
        HStack {
            VStack(alignment: .leading) {
                Text("\(name)")
                    .font(Font.title3)
                    .fontWeight(Font.Weight.semibold)
                Text("12:00 - 14:00")
                Text("Main Library 147")
            }
            Spacer()
            VStack {
                Image(systemName: "person.fill")
                    .foregroundColor(statusColor)
                Text("\(enrolments)/\(capacity)")
                    .foregroundColor(statusColor)
            }
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 15)
        Divider()
            .overlay(Color.gray.frame(height: 1))
    }
}

struct AddClass: View {
    
    var body: some View {
        VStack {
            Divider()
            HStack {
                Image(systemName: "plus.circle.fill")
                    .foregroundColor(Color.blue)
                    
                Text("Add class")
                    .foregroundColor(Color.blue)
                    .font(.title2)
                Spacer()
            }
            .padding(15)
        }
    }
}

#Preview {
    ContentView()
}

