//
//  AddToWaitlistButton.swift
//  No Waitlist
//
//  Created by Joye Fu on 22/9/2025.
//
import SwiftUI

struct AddToWaitlistButton: View {
    
    var body: some View {
        HStack {
            Spacer()
            Text("Add to waitlist")
                .foregroundColor(Color.white)
                .padding(20)
                .font(.title2)
                .fontWeight(.semibold)
            Spacer()
        }
        .background(AppColor.selectGreen)
        .cornerRadius(50)
        .padding(.horizontal, 30)
    }
}

#Preview {
    AddToWaitlistButton()
}
