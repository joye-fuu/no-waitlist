//
//  Interfaces.swift
//  No Waitlist
//
//  Created by Joye Fu on 20/9/2025.
//
import Foundation

struct ClassInfo: Hashable, Codable {
    var classID: Int // 1234
    var activity: String // lab, tute
    var courseCode: String // COMP1234
    var capcity: Int
    var enrolments: Int
    var courseName: String // Object-oriented blah
    var mode: String // In person, online
    var section: String // M11A, M13A
}

//struct CourseInfo: Hashable, Codable {
//    var code: String // COMP1234
//    var term: String // T1, T2, T3
//    var classes: [ClassInfo]
//}
//
//struct ClassInfo: Hashable, Codable {
//    var id: Int // 2922
//    var code: String // W12A
//    var activity: String // Lecture, Lab, Tutorial, Seminar
//    var start: String // 12:00
//    var end: String // 14:00
//    var location: String // Central Lecture Block 7
//}
