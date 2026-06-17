-- Pin/lock scheduled tasks so Smart Schedule won't move them
ALTER TABLE "Task" ADD COLUMN "scheduleLocked" BOOLEAN NOT NULL DEFAULT false;
