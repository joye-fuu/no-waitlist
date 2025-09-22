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
        NavigationStack {
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
        }
        .safeAreaInset(edge: .bottom) {
            HomeFooter()
        }
    }
}

#Preview("Loading State") {
    HomeView()
        .environmentObject(ClassStore())
}

#Preview("With Mock Data") {
    let store = ClassStore()
    store.useMockData = true
    return HomeView()
        .environmentObject(store)
}

#Preview("Empty State") {
    let store = ClassStore()
    // Keep store empty to test empty state UI
    return HomeView()
        .environmentObject(store)
}
