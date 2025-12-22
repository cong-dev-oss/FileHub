namespace WebApp.Core.Interfaces;

public interface IUnitOfWork : IDisposable
{
    IRepository<Entities.User> Users { get; }
    IRepository<Entities.FileMetadata> Files { get; }
    IRepository<Entities.Folder> Folders { get; }
    IRepository<Entities.Content> Contents { get; }
    IRepository<Entities.ContentFile> ContentFiles { get; }
    IRepository<Entities.VideoConversionJob> VideoConversionJobs { get; }
    
    IRepository<T> GetRepository<T>() where T : class;
    
    Task<int> SaveChangesAsync();
    Task BeginTransactionAsync();
    Task CommitTransactionAsync();
    Task RollbackTransactionAsync();
}
