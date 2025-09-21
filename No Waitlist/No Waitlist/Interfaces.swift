//
//  Interfaces.swift
//  No Waitlist
//
//  Created by Joye Fu on 20/9/2025.
//

import Foundation
import FirebaseFirestore

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

struct Location: Codable {
    var building: String
    var full: String
    var room: String
}

struct Schedule: Codable {
    var dayOfWeek: String    // e.g. "Wed"
    var startTime: String    // "16:00"
    var endTime: String      // "18:00"
    var timeDisplay: String  // "16:00-18:00"
    var fullSchedule: String
}
