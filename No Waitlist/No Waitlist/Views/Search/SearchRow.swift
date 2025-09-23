//
//  SearchRow.swift
//  No Waitlist
//
//  Created by Joye Fu on 22/9/2025.
//
import SwiftUI

struct SearchRow: View {
    let classOffering: ClassOffering
    let selected: Bool
    
    var activity: String {
        if classOffering.activity == "Tutorial-Laboratory" {
            return "Tutorial-Lab"
        } else if classOffering.activity == "Laboratory" {
            return "Lab"
        } else {
            return classOffering.activity
        }
    }
    
    var textColor: Color {
        return selected ? Color.white : AppColor.textParagraph
    }
    var subtitleColor: Color {
        return selected ? Color.white : AppColor.textSubtitle
    }
    var iconColor: Color {
        return selected ? Color.white : classOffering.courseEnrolment.displayColor
    }
    var backgroundColor: Color {
        return selected ? AppColor.selectGreen : Color.white
    }
        
    var body: some View {
        HStack {
            VStack(alignment: .leading) {
                Text("\(classOffering.courseCode) \(activity)")
                    .fontWeight(Font.Weight.semibold)
                    .foregroundColor(textColor)
                Text(classOffering.schedule.displayString)
                    .foregroundColor(textColor)
                Text(classOffering.location.displayString)
                    .foregroundColor(textColor)
                Text(classOffering.section)
                    .foregroundColor(subtitleColor)
            }
            Spacer()
            VStack {
                Image(systemName: "person.fill")
                    .foregroundColor(iconColor)
                    .imageScale(.large)
                    .padding(.vertical, 1)
                Text(classOffering.courseEnrolment.displayString)
                    .foregroundColor(iconColor)
                    .fontWeight(Font.Weight.semibold)
            }
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 15)
        .background(backgroundColor)
    }
}

#Preview {
    SearchRow(classOffering: MockData.singleClass, selected: false)
}

