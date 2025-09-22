//
//  HomeFooter.swift
//  No Waitlist
//
//  Created by Joye Fu on 22/9/2025.
//

import SwiftUI

struct HomeFooter: View {
    var body: some View {
        VStack {
            Divider()
            HStack {
                Image(systemName: "plus.circle.fill")
                    .foregroundColor(AppColor.primaryBlue)
                    .font(.system(size: 28))
                    .padding(.leading, 10)
                    
                Text("Add class")
                    .foregroundColor(AppColor.primaryBlue)
                    .font(.title2)
                    .fontWeight(.bold)
                Spacer()
            }
            .padding(20)
        }.background(AppColor.footerGrey)
    }
}
