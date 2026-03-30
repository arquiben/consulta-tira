
import { useStore } from '@/store/useStore';

export const exportToGit = () => {
  const { allPatients, clinicSettings } = useStore.getState();
  const data = {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    source: 'Consulfision Mobile',
    settings: clinicSettings,
    patients: allPatients
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `consulfision-git-export-${new Date().getTime()}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

export const exportToGlide = () => {
  const { allPatients } = useStore.getState();
  
  // Glide likes CSV
  const headers = ['ID', 'Name', 'Gender', 'Age', 'Phone', 'Address', 'Weight', 'Height', 'Blood Type'];
  const rows = allPatients.map(p => [
    p.id,
    p.name,
    p.gender,
    p.age,
    p.phone,
    p.address,
    p.weight,
    p.height,
    p.bloodType
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.map(c => `"${c || ''}"`).join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `consulfision-glide-export-${new Date().getTime()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

export const exportToNetlify = () => {
  const { allPatients, clinicSettings } = useStore.getState();
  // Netlify often uses a static JSON file for data-driven sites
  const data = {
    site_metadata: {
      title: clinicSettings.clinicName || 'Consulfision Clinic',
      therapist: clinicSettings.therapistName,
      last_updated: new Date().toISOString()
    },
    data: allPatients
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `netlify-data-${new Date().getTime()}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

export const exportToFlutter = () => {
  const { allPatients } = useStore.getState();
  
  // Prepare a Dart class representation or a clean JSON for Dartpad/Flutter
  const dartCode = `
// Consulfision Patient Model for Flutter
class Patient {
  final String id;
  final String name;
  final String gender;
  final int age;
  final String phone;

  Patient({
    required this.id,
    required this.name,
    required this.gender,
    required this.age,
    required this.phone,
  });

  factory Patient.fromJson(Map<String, dynamic> json) {
    return Patient(
      id: json['id'],
      name: json['name'],
      gender: json['gender'],
      age: json['age'],
      phone: json['phone'],
    );
  }
}

// Sample Data
final List<Map<String, dynamic>> patientData = ${JSON.stringify(allPatients.slice(0, 5), null, 2)};
  `;
  
  const blob = new Blob([dartCode], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `consulfision-flutter-dartpad-${new Date().getTime()}.dart`;
  a.click();
  URL.revokeObjectURL(url);
};
