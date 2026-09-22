const { normalizeDepartmentCode } = require('./lib/constants/departments');

function isIncidentAssignedToWorkerDept(incident, worker) {
  const workerDept = normalizeDepartmentCode(
    worker.departmentCode || worker.departmentId || worker.departmentName
  );
  const incidentDept = normalizeDepartmentCode(
    incident.department_id || incident.departmentId || incident.departmentCode || incident.department_code || incident.departments?.code || incident.departments?.id || incident.departments?.name,
    incident.category
  );
  console.log(`Incident ID: ${incident.id}`);
  console.log(`Worker Dept: ${workerDept}, Incident Dept: ${incidentDept}`);
  return workerDept === incidentDept;
}

const worker = {
  id: 'user-worker-road-001',
  email: 'road.worker@civicshield.demo',
  fullName: 'Alex Rivera (Road Maintenance Lead)',
  role: 'WORKER',
  departmentId: 'dept_roads',
  departmentCode: 'ROAD_MAINT',
  departmentName: 'Road Maintenance',
};

const incident = {
  id: 'test-incident-1',
  category: 'ROAD_POTHOLE',
  department_id: '11111111-1111-1111-1111-111111111111'
};

console.log(isIncidentAssignedToWorkerDept(incident, worker));
