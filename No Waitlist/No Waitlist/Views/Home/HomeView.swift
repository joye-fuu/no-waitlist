//
//  HomeView.swift
//  No Waitlist
//
//  Created by Joye Fu on 21/9/2025.
//

import SwiftUI

struct HomeView: View {
    @EnvironmentObject var store: ClassStore
    
    var body: some View {
        VStack {
            if store.classes.isEmpty {
                Text("Loading classes...")
                    .foregroundColor(.gray)
            } else {
                List(store.classes) { classOffering in
                    ClassRow(classOffering: classOffering)
                }
            }
        }
        .task {
            await store.load()
        }
        .navigationTitle("My Waitlist")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button(action: {/* todo go to settings*/}) {
                    Image(systemName: "gearshape.fill")
                }
            }
        }
        .safeAreaInset(edge: .bottom) {
            NavigationLink(destination: {
                SearchView()
            }, label: {
                HomeFooter()
            })
        }
    }
}

#Preview("Loading State") {
    NavigationStack {
        HomeView()
            .environmentObject(ClassStore())
    }
}

#Preview("With Mock Data") {
    let store = ClassStore()
    store.useMockData = true
    return NavigationStack {
        HomeView()
    }
    .environmentObject(store)
}
