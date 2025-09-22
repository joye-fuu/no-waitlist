//
//  MockData.swift
//  No Waitlist
//
//  Created by GitHub Copilot on 21/9/2025.
//

import Foundation

struct MockData {
    
    // MARK: - Mock Classes
    static let classes: [ClassOffering] = [
        ClassOffering(
            id: "mock1",
            activity: "Lecture",
            classID: 12345,
            courseCode: "COMP1511",
            courseName: "Programming Fundamentals",
            mode: "In Person",
            scrapedFor: "2025T3",
            section: "T18A",
            status: "Open",
            term: "2025T3",
            courseEnrolment: CourseEnrolment(capacity: 24, enrolments: 18),
            location: Location(building: "EE", full: "Electrical Engineering G03", room: "G03"),
            schedule: Schedule(dayOfWeek: "Mon", startTime: "14:00", endTime: "17:00", timeDisplay: "14:00-17:00", fullSchedule: "Monday 14:00 - 17:00"),
            lastUpdated: Date()
        ),
        ClassOffering(
            id: "mock2",
            activity: "Tutorial",
            classID: 12346,
            courseCode: "COMP2521",
            courseName: "Data Structures and Algorithms",
            mode: "In Person",
            scrapedFor: "2025T3",
            section: "T15A",
            status: "Full",
            term: "2025T3",
            courseEnrolment: CourseEnrolment(capacity: 25, enrolments: 25),
            location: Location(building: "CLB", full: "Central Lecture Block 7", room: "7"),
            schedule: Schedule(dayOfWeek: "Wed", startTime: "16:00", endTime: "18:00", timeDisplay: "16:00-18:00", fullSchedule: "Wednesday 16:00 - 18:00"),
            lastUpdated: Date()
        ),
        ClassOffering(
            id: "mock3",
            activity: "Lab",
            classID: 12347,
            courseCode: "COMP3900",
            courseName: "Computer Science Project",
            mode: "Hybrid",
            scrapedFor: "2025T3",
            section: "H09A",
            status: "On Waitlist",
            term: "2025T3",
            courseEnrolment: CourseEnrolment(capacity: 20, enrolments: 23),
            location: Location(building: "K17", full: "Computer Science Building 117", room: "117"),
            schedule: Schedule(dayOfWeek: "Fri", startTime: "10:00", endTime: "13:00", timeDisplay: "10:00-13:00", fullSchedule: "Friday 10:00 - 13:00"),
            lastUpdated: Date()
        ),
        ClassOffering(
            id: "mock4",
            activity: "Workshop",
            classID: 12348,
            courseCode: "DESN2000",
            courseName: "Engineering Design and Professional Practice",
            mode: "Online",
            scrapedFor: "2025T3",
            section: "W12B",
            status: "Open",
            term: "2025T3",
            courseEnrolment: CourseEnrolment(capacity: 30, enrolments: 15),
            location: Location(building: "Online", full: "Online", room: "N/A"),
            schedule: Schedule(dayOfWeek: "Thu", startTime: "12:00", endTime: "14:00", timeDisplay: "12:00-14:00", fullSchedule: "Thursday 12:00 - 14:00"),
            lastUpdated: Date()
        ),
        ClassOffering(
            id: "mock5",
            activity: "Seminar",
            classID: 12349,
            courseCode: "COMP4920",
            courseName: "Professional Issues and Ethics in Information Technology",
            mode: "In Person",
            scrapedFor: "2025T3",
            section: "S01A",
            status: "Nearly Full",
            term: "2025T3",
            courseEnrolment: CourseEnrolment(capacity: 50, enrolments: 47),
            location: Location(building: "ASB", full: "Australian School of Business 115", room: "115"),
            schedule: Schedule(dayOfWeek: "Tue", startTime: "18:00", endTime: "21:00", timeDisplay: "18:00-21:00", fullSchedule: "Tuesday 18:00 - 21:00"),
            lastUpdated: Date()
        )
    ]
    
    // MARK: - Convenience Methods
    
    /// Returns a single mock class for testing
    static var singleClass: ClassOffering {
        return classes[0]
    }
    
    /// Returns mock classes with specific status for testing
    static func classes(withStatus status: String) -> [ClassOffering] {
        return classes.filter { $0.status == status }
    }
    
    /// Returns mock classes for a specific course code
    static func classes(forCourse courseCode: String) -> [ClassOffering] {
        return classes.filter { $0.courseCode == courseCode }
    }
    
    // MARK: - Edge Case Data
    
    /// Mock data for testing edge cases
    static let edgeCaseClasses: [ClassOffering] = [
        ClassOffering(
            id: "edge1",
            activity: "Laboratory",
            classID: 99999,
            courseCode: "COMP9999",
            courseName: "Very Very Very Long Course Name That Might Break UI Layout Testing Purposes Only",
            mode: "Hybrid",
            scrapedFor: "2025T3",
            section: "VERYLONGSECTION99",
            status: "Waitlist Full - Contact School",
            term: "2025T3",
            courseEnrolment: CourseEnrolment(capacity: 0, enrolments: 0),
            location: Location(building: "UNKNOWN", full: "Building Name That Is Extremely Long And Might Cause Display Issues", room: "Room999999"),
            schedule: Schedule(dayOfWeek: "Sat", startTime: "06:00", endTime: "23:59", timeDisplay: "06:00-23:59", fullSchedule: "Saturday 06:00 - 23:59"),
            lastUpdated: Date()
        )
    ]
}
