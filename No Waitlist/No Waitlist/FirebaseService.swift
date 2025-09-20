//
//  FirebaseService.swift
//  No Waitlist
//
//  Created by GitHub Copilot on 21/9/2025.
//

import Foundation
import FirebaseFirestore
import FirebaseFunctions

class FirebaseService: ObservableObject {
    private let db = Firestore.firestore()
    private let functions = Functions.functions()
    
    // MARK: - Waitlist Operations
    
    func addToWaitlist(classId: Int, courseCode: String, section: String) async throws {
        let addToWaitlist = functions.httpsCallable("addToWaitlist")
        
        let data: [String: Any] = [
            "classId": classId,
            "courseCode": courseCode,
            "section": section
        ]
        
        do {
            let _ = try await addToWaitlist.call(data)
            print("Successfully added to waitlist: \(courseCode) \(section)")
        } catch {
            print("Error adding to waitlist: \(error)")
            throw error
        }
    }
    
    func removeFromWaitlist(classId: Int) async throws {
        let removeFromWaitlist = functions.httpsCallable("removeFromWaitlist")
        
        let data: [String: Any] = [
            "classId": classId
        ]
        
        do {
            let _ = try await removeFromWaitlist.call(data)
            print("Successfully removed from waitlist: \(classId)")
        } catch {
            print("Error removing from waitlist: \(error)")
            throw error
        }
    }
    
    func getWaitlist() async throws -> [[String: Any]] {
        let getWaitlist = functions.httpsCallable("getWaitlist")
        
        do {
            let result = try await getWaitlist.call()
            if let data = result.data as? [String: Any],
               let waitlist = data["waitlist"] as? [[String: Any]] {
                return waitlist
            }
            return []
        } catch {
            print("Error getting waitlist: \(error)")
            throw error
        }
    }
    
    // MARK: - Class Data Operations
    
    func getClasses() async throws -> [ClassData] {
        do {
            let snapshot = try await db.collection("classes").getDocuments()
            var classes: [ClassData] = []
            
            for document in snapshot.documents {
                let data = document.data()
                
                // Parse the class data
                if let classData = parseClassData(from: data) {
                    classes.append(classData)
                }
            }
            
            return classes
        } catch {
            print("Error fetching classes: \(error)")
            throw error
        }
    }
    
    func searchClasses(courseCode: String) async throws -> [ClassData] {
        do {
            let snapshot = try await db.collection("classes")
                .whereField("courseCode", isEqualTo: courseCode.uppercased())
                .getDocuments()
            
            var classes: [ClassData] = []
            
            for document in snapshot.documents {
                let data = document.data()
                
                if let classData = parseClassData(from: data) {
                    classes.append(classData)
                }
            }
            
            return classes
        } catch {
            print("Error searching classes: \(error)")
            throw error
        }
    }
    
    // MARK: - Helper Methods
    
    private func parseClassData(from data: [String: Any]) -> ClassData? {
        guard let courseCode = data["courseCode"] as? String,
              let courseName = data["courseName"] as? String,
              let classID = data["classID"] as? Int,
              let section = data["section"] as? String,
              let term = data["term"] as? String,
              let activity = data["activity"] as? String,
              let status = data["status"] as? String else {
            return nil
        }
        
        // Parse enrollment data
        var enrolments = 0
        var capacity = 0
        if let courseEnrolment = data["courseEnrolment"] as? [String: Any] {
            enrolments = courseEnrolment["enrolments"] as? Int ?? 0
            capacity = courseEnrolment["capacity"] as? Int ?? 0
        }
        
        // Parse term dates
        var startDate = ""
        var endDate = ""
        if let termDates = data["termDates"] as? [String: Any] {
            startDate = termDates["start"] as? String ?? ""
            endDate = termDates["end"] as? String ?? ""
        }
        
        return ClassData(
            courseCode: courseCode,
            courseName: courseName,
            classID: classID,
            section: section,
            term: term,
            activity: activity,
            status: status,
            enrolments: enrolments,
            capacity: capacity,
            termStartDate: startDate,
            termEndDate: endDate,
            mode: data["mode"] as? String ?? "In Person",
            notes: data["notes"] as? String
        )
    }
}

// MARK: - Data Models

struct ClassData: Identifiable, Codable {
    let id = UUID()
    let courseCode: String
    let courseName: String
    let classID: Int
    let section: String
    let term: String
    let activity: String
    let status: String
    let enrolments: Int
    let capacity: Int
    let termStartDate: String
    let termEndDate: String
    let mode: String
    let notes: String?
    
    var isOpen: Bool {
        return status.lowercased() == "open" && enrolments < capacity
    }
    
    var isFull: Bool {
        return enrolments >= capacity
    }
    
    var availableSpots: Int {
        return max(0, capacity - enrolments)
    }
}
