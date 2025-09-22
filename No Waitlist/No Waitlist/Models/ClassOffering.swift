//
//  ClassOffering.swift
//  No Waitlist
//
//  Created by Joye Fu on 20/9/2025.
//

import Foundation
import FirebaseFirestore
import SwiftUI

struct ClassOffering: Identifiable, Codable {
    @DocumentID var id: String?

    // top-level fields
    var activity: String
    var classID: Int
    var courseCode: String
    var courseName: String
    var mode: String         // e.g. "In Person"

    var scrapedFor: String
    var section: String
    var status: String
    var term: String

    // nested maps
    var courseEnrolment: CourseEnrolment
    var location: Location
    var schedule: Schedule

    // Firestore Timestamp -> Date
    @ServerTimestamp var lastUpdated: Date?
}

struct CourseEnrolment: Codable {
    var capacity: Int
    var enrolments: Int
}

extension CourseEnrolment {
    var displayString: String {
        return "\(enrolments)/\(capacity)"
    }
    
    var displayColor: Color {
        if enrolments < capacity {
            return AppColor.primaryGreen
        } else {
            return AppColor.primaryRed
        }
    }
}

struct Location: Codable {
    var building: String
    var full: String
    var room: String
}

extension Location {
    var displayString: String {
        if building.isEmpty || room.isEmpty {
            return "Location not available"
        } else {
            return "\(building) \(room)"
        }
    }
}

struct Schedule: Codable {
    var dayOfWeek: String    // e.g. "Wed"
    var startTime: String    // "16:00"
    var endTime: String      // "18:00"
    var timeDisplay: String  // "16:00-18:00"
    var fullSchedule: String
}

extension Schedule {
    var displayString: String {
        if dayOfWeek.isEmpty || startTime.isEmpty || endTime.isEmpty {
            return "-"
        } else {
            return "\(dayOfWeek) \(startTime) - \(endTime)"
        }
    }
}
