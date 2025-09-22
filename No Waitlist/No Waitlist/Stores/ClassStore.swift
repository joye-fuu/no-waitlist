//
//  ClassStore.swift
//  No Waitlist
//
//  Created by Joye Fu on 20/9/2025.
//

//  Equivalent of ModelData from the tutorial

import Foundation
import FirebaseFirestore
import SwiftUI
import os
import Combine

@MainActor
final class ClassStore: ObservableObject {
    
    @Published private(set) var classes: [ClassOffering] = []
    
    private let db = Firestore.firestore()
    private let log = Logger(subsystem: "com.jfu.nowaitlist", category: "firestore")
    
    var useMockData: Bool = false
    
    func loadMockData() {
        print("Loading mock data...")
        for item in MockData.classes {
            print("Mock Class: \(item.courseCode) \(item.section) - \(item.courseName)")
            print("  Status: \(item.status)")
            print("  Location: \(item.location.full)")
            print("  Schedule: \(item.schedule.dayOfWeek) \(item.schedule.timeDisplay)")
            print("  Enrollment: \(item.courseEnrolment.enrolments)/\(item.courseEnrolment.capacity)")
            print("---")
        }
        self.classes = MockData.classes
    }
    
    func load() async {
        // Use mock data in development/preview mode
        if useMockData {
            loadMockData()
            return
        }
        
        do {
            let snap = try await db.collection("classes").getDocuments()
            var out: [ClassOffering] = []
            for doc in snap.documents {
                do {
                    out.append(try doc.data(as: ClassOffering.self))
                } catch {
                    log.error("Decode failed for doc \(doc.documentID)")
                }
            }
            out.removeAll(where: {$0.activity == "Course Enrolment" || $0.activity == "Unknown" || $0.activity == "Lecture"})
            
            // Update the published property to trigger UI updates
            self.classes = out
            
        } catch {
            log.error("Query failed: \(error)")
        }
    }
}
