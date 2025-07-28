export const schemas = {
  client: {
    clientid: ["clientid", "client_id", "id"],
    clientname: ["clientname", "client_name", "name"],
    prioritylevel: ["prioritylevel", "priority_level", "priority"],
    requestedtaskids: ["requestedtaskids", "requested_task_ids", "requestedtasks"],
    grouptag: ["grouptag", "group_tag", "group"],
    attributesjson: ["attributesjson", "attributes_json", "attributes"],
  },
  worker: {
    workerid: ["workerid", "worker_id", "id"],
    workername: ["workername", "worker_name", "name"],
    skills: ["skills"],
    availableslots: ["availableslots", "available_slots", "slots"],
    maxloadperphase: ["maxloadperphase", "max_load_per_phase", "maxload"],
    workergroup: ["workergroup", "worker_group", "group"],
    qualificationlevel: ["qualificationlevel", "qualification_level", "qualification"],
  },
  task: {
    taskid: ["taskid", "task_id", "id"],
    taskname: ["taskname", "task_name", "name"],
    category: ["category"],
    duration: ["duration"],
    requiredskills: ["requiredskills", "required_skills", "skills"],
    preferredphases: ["preferredphases", "preferred_phases", "phases"],
    maxconcurrent: ["maxconcurrent", "max_concurrent", "concurrent"],
  }
};