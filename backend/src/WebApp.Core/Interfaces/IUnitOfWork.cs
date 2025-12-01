namespace WebApp.Core.Interfaces;

public interface IUnitOfWork : IDisposable
{
    IRepository<Entities.User> Users { get; }
    IRepository<Entities.FileMetadata> Files { get; }
    IRepository<Entities.Content> Contents { get; }
    IRepository<Entities.ContentFile> ContentFiles { get; }
    
    Task<int> SaveChangesAsync();
    Task BeginTransactionAsync();
    Task CommitTransactionAsync();
    Task RollbackTransactionAsync();
}



