//
//  HomeHeader.swift
//  No Waitlist
//
//  Created by Joye Fu on 20/9/2025.
//

import SwiftUI

struct HomeHeader: View {
    
    var body: some View {
            Text("My Waitlist")
                .font(Font.title)
                .fontWeight(Font.Weight.semibold)
                .padding(15)
            HStack {
                Spacer()
                Button {
                    // todo settings page
                } label: {
                    Image(systemName: "gearshape.fill")
                }
                .padding(.trailing, 15)
            }
        }
}

