// Mock API to simulate backend behavior without requiring a real server
import { Task } from '@/types/Task';

const USERS = [
  { username: "AS", password: "dz4132" },
  { username: "TS", password: "dz4132" },
  { username: "MW", password: "dz4132" },
  { username: "ZS", password: "dz4132" }
];

const STORAGE_KEYS = {
  USER: 'taskboard_user',
  TASKS: 'taskboard_tasks'
};

// Simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const mockApi = {
  async login(username: string, password: string) {
    await delay(500); // Simulate network delay
    
    const user = USERS.find(u => u.username === username && u.password === password);
    if (user) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify({ username: user.username }));
      return { username: user.username };
    } else {
      throw new Error('Invalid credentials');
    }
  },

  async logout() {
    await delay(200);
    localStorage.removeItem(STORAGE_KEYS.USER);
  },

  async getCurrentUser() {
    await delay(200);
    const userStr = localStorage.getItem(STORAGE_KEYS.USER);
    if (userStr) {
      return JSON.parse(userStr);
    }
    return null;
  },

  async getTasks(): Promise<Task[]> {
    await delay(300);
    const tasksStr = localStorage.getItem(STORAGE_KEYS.TASKS);
    return tasksStr ? JSON.parse(tasksStr) : [];
  },

  async createTask(taskData: { business_name: string; brief: string; created_by: string }): Promise<Task> {
    await delay(500);
    
    const tasks = await this.getTasks();
    const newTask: Task = {
      id: Date.now().toString(),
      business_name: taskData.business_name,
      brief: taskData.brief,
      status: 'open',
      created_at: Date.now(),
      created_by: taskData.created_by,
      taken_by: undefined,
      completed_at: undefined,
      zip_path: undefined,
      is_deleted: false
    };
    
    tasks.push(newTask);
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    return newTask;
  },

  async claimTask(taskId: string, username: string): Promise<Task> {
    await delay(500);
    
    const tasks = await this.getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) throw new Error('Task not found');
    
    task.status = 'in_progress';
    task.taken_by = username;
    
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    return task;
  },

  async completeTask(taskId: string, zipFile: File): Promise<Task> {
    await delay(1000);
    
    const tasks = await this.getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) throw new Error('Task not found');
    
    // Store file as base64 for download
    const fileData = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(zipFile);
    });
    
    const zipPath = `${taskId}_${zipFile.name}`;
    
    // Store file data in localStorage
    localStorage.setItem(`task_file_${taskId}`, JSON.stringify({
      fileName: zipFile.name,
      fileData: fileData,
      fileType: zipFile.type
    }));
    
    task.status = 'completed';
    task.completed_at = Date.now();
    task.zip_path = zipPath;
    
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    return task;
  },

  async revertTask(taskId: string): Promise<Task> {
    await delay(300);
    const tasks = await this.getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) throw new Error('Task not found');
    
    task.status = 'open';
    task.taken_by = undefined;
    
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    return task;
  },

  async downloadTask(taskId: string): Promise<void> {
    const fileData = localStorage.getItem(`task_file_${taskId}`);
    if (!fileData) throw new Error('File not found');
    
    const { fileName, fileData: base64Data } = JSON.parse(fileData);
    
    // Convert base64 to blob and download
    const link = document.createElement('a');
    link.href = base64Data;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  async clearHistory(): Promise<void> {
    await delay(300);
    localStorage.removeItem(STORAGE_KEYS.TASKS);
    // Clear all task files
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('task_file_')) {
        localStorage.removeItem(key);
      }
    });
  },

  async deleteTask(taskId: string): Promise<void> {
    await delay(500);
    
    const tasks = await this.getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) throw new Error('Task not found');
    
    task.is_deleted = true;
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  }
};