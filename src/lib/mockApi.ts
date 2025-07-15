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
      zip_url: undefined,
      is_deleted: false,
      is_archived: false
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
    
    try {
      // For large files, we'll just store file metadata and simulate upload
      const fileInfo = {
        fileName: zipFile.name,
        fileSize: zipFile.size,
        fileType: zipFile.type,
        uploadedAt: Date.now()
      };
      
      const zipPath = `${taskId}_${zipFile.name}`;
      
      // Store file info instead of actual file data for large files
      localStorage.setItem(`task_file_${taskId}`, JSON.stringify(fileInfo));
      
      task.status = 'completed';
      task.completed_at = Date.now();
      task.zip_url = zipPath;
      
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
      return task;
    } catch (error) {
      throw new Error('Failed to process file upload');
    }
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
    
    const fileInfo = JSON.parse(fileData);
    
    // Simulate download for demonstration (in real app, this would download from server)
    const blob = new Blob(['File content would be downloaded from server'], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = fileInfo.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  async clearHistory(): Promise<void> {
    await delay(300);
    const tasks = await this.getTasks();
    
    // Only remove deleted tasks
    const activeTasks = tasks.filter(task => !task.is_deleted);
    const deletedTasks = tasks.filter(task => task.is_deleted);
    
    // Clear file data for deleted tasks only
    deletedTasks.forEach(task => {
      localStorage.removeItem(`task_file_${task.id}`);
    });
    
    // Keep only active tasks
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(activeTasks));
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