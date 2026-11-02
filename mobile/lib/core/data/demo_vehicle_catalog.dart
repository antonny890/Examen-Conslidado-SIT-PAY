class DemoVehicleCatalog {
  static const vehicles = <Map<String, String>>[
    {
      'id': 'demo-vehicle-1',
      'plate': 'V7A-890',
      'qrCode': 'SIT-VEH-V7A890-DEMO',
      'company': 'Transcayma',
      'unit': 'C3 · Cayma',
    },
    {
      'id': 'demo-vehicle-2',
      'plate': 'V8B-123',
      'qrCode': 'SIT-VEH-V8B123-DEMO',
      'company': 'AQP Masivo',
      'unit': 'C2 · Cono Norte - Cerro Colorado',
    },
    {
      'id': 'demo-vehicle-3',
      'plate': 'V9C-456',
      'qrCode': 'SIT-VEH-V9C456-DEMO',
      'company': 'Unión AQP',
      'unit': 'C6 · Paucarpata - Miguel Grau',
    },
  ];

  static Map<String, String>? find({String? plate, String? qrCode}) {
    for (final vehicle in vehicles) {
      if (plate != null && vehicle['plate'] == plate.toUpperCase()) {
        return vehicle;
      }
      if (qrCode != null && vehicle['qrCode'] == qrCode) {
        return vehicle;
      }
    }
    return null;
  }
}
