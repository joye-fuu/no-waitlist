//
//  SearchView.swift
//  No Waitlist
//
//  Created by Joye on 22/9/2025.
//

import SwiftUI

struct SearchView: View {
    @EnvironmentObject var store: ClassStore
    @Environment(\.dismiss) private var dismiss
    @State private var searchText = ""
    @State private var selected: Set<Int> = [] // array of classIDs
    
    var body: some View {
        VStack {
            SearchBar(text: $searchText)
            
            if store.classes.isEmpty {
                Text("Loading classes...")
                    .foregroundColor(.gray)
            } else if searchText.isEmpty {
                ContentUnavailableView(
                    "Search for Classes",
                    systemImage: "magnifyingglass",
                    description: Text("Enter a course code or name to find classes")
                )
            } else {
                List(filteredClasses) { classOffering in
                    SearchRow(
                        classOffering: classOffering,
                        selected: selected.contains(classOffering.classID)
                    )
                }
            }
        }
        .task {
            await store.load()
        }
        .navigationTitle("Search Classes")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button(action: {/* todo go to settings*/}) {
                    Image(systemName: "gearshape.fill")
                }
            }
        }
        .safeAreaInset(edge: .bottom) {
            AddToWaitlistButton()
        }
    }
    
    
    private var filteredClasses: [ClassOffering] {
        if searchText.isEmpty {
            return []
        }
        return store.classes.filter { classOffering in
            classOffering.courseCode.localizedCaseInsensitiveContains(searchText) ||
            classOffering.courseName.localizedCaseInsensitiveContains(searchText) ||
            classOffering.section.localizedCaseInsensitiveContains(searchText)
        }
    }
}

struct SearchBar: View {
    @Binding var text: String
    
    var body: some View {
        HStack {
            Image(systemName: "magnifyingglass")
                .foregroundColor(.secondary)
            
            TextField("Search courses...", text: $text)
                .textFieldStyle(PlainTextFieldStyle())
                .padding(10)
                .foregroundColor(AppColor.textParagraph)
                .background(AppColor.borderGrey)
                .cornerRadius(50)
        }
        .padding(.horizontal)
    }
}

#Preview {
    let store = ClassStore()
    store.useMockData = true
    return NavigationStack {
        SearchView()
    }
    .environmentObject(store)
}
