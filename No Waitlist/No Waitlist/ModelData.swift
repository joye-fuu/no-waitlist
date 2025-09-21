//
//  ModelData.swift
//  No Waitlist
//
//  Created by Joye Fu on 20/9/2025.
//
import Foundation
import FirebaseFirestore

let db = Firestore.firestore()

func load() async throws -> [ClassOffering] {
    let snapshot = try await db.collection("classes").getDocuments()
    return try snapshot.documents.map { try $0.data(as: ClassOffering.self)}
}


//var courses: [ClassInfo] = load("courseData.json")
//
//func load<T: Decodable>(_ filename: String) -> T {
//    let data: Data
//    
//    guard let file = Bundle.main.url(forResource: filename, withExtension: nil)
//    else {
//        fatalError("Couldn't find \(filename) from main bundle.")
//    }
//    
//    do {
//        data = try Data(contentsOf: file)
//    } catch {
//        fatalError("Couldn't find \(filename) from main bundle:\n\(error)")
//    }
//    
//    do {
//        let decoder = JSONDecoder()
//        return try decoder.decode(T.self, from: data)
//    } catch {
//        fatalError("Couldn't parse \(filename) as \(T.self):\n\(error)")
//    }
//
//}
