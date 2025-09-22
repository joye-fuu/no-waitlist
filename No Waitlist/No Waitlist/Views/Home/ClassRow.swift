//
//  ClassRow.swift
//  No Waitlist
//
//  Created by Joye Fu on 21/9/2025.
//

import SwiftUI

struct ClassRow: View {
    let classOffering: ClassOffering
    
    var activity: String {
        if classOffering.activity == "Tutorial-Laboratory" {
            return "Tutorial-Lab"
        } else if classOffering.activity == "Laboratory" {
            return "Lab"
        } else {
            return classOffering.activity
        }
    }
        
    var body: some View {
        HStack {
            VStack(alignment: .leading) {
                Text("\(classOffering.courseCode) \(activity)")
                    .fontWeight(Font.Weight.semibold)
                Text(classOffering.schedule.displayString)
                Text(classOffering.location.displayString)
                Text(classOffering.section)
                    .foregroundColor(AppColor.textSubtitle)
            }
            Spacer()
            VStack {
                Image(systemName: "person.fill")
                    .foregroundColor(classOffering.courseEnrolment.displayColor)
                    .imageScale(.large)
                    .padding(.vertical, 1)
                Text(classOffering.courseEnrolment.displayString)
                    .foregroundColor(classOffering.courseEnrolment.displayColor)
                    .fontWeight(Font.Weight.semibold)
            }
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 15)
    }
}

//#Preview {
//    ClassRow(classOffering: MockData.singleClass)
//}
