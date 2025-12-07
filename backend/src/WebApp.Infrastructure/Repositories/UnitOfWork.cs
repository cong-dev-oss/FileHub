using Microsoft.EntityFrameworkCore.Storage;
using WebApp.Core.Interfaces;
using WebApp.Infrastructure.Data;

namespace WebApp.Infrastructure.Repositories;

public class UnitOfWork : IUnitOfWork
{
    private readonly ApplicationDbContext _context;
    private IDbContextTransaction? _transaction;

    public UnitOfWork(ApplicationDbContext context)
    {
        _context = context;
        Users = new Repository<Core.Entities.User>(_context);
        Files = new Repository<Core.Entities.FileMetadata>(_context);
        Folders = new Repository<Core.Entities.Folder>(_context);
        Contents = new Repository<Core.Entities.Content>(_context);
        ContentFiles = new Repository<Core.Entities.ContentFile>(_context);
        VideoConversionJobs = new Repository<Core.Entities.VideoConversionJob>(_context);
    }

    public IRepository<Core.Entities.User> Users { get; }
    public IRepository<Core.Entities.FileMetadata> Files { get; }
    public IRepository<Core.Entities.Folder> Folders { get; }
    public IRepository<Core.Entities.Content> Contents { get; }
    public IRepository<Core.Entities.ContentFile> ContentFiles { get; }
    public IRepository<Core.Entities.VideoConversionJob> VideoConversionJobs { get; }

    public async Task<int> SaveChangesAsync()
    {
        return await _context.SaveChangesAsync();
    }

    public async Task BeginTransactionAsync()
    {
        _transaction = await _context.Database.BeginTransactionAsync();
    }

    public async Task CommitTransactionAsync()
    {
        if (_transaction != null)
        {
            await _transaction.CommitAsync();
            await _transaction.DisposeAsync();
            _transaction = null;
        }
    }

    public async Task RollbackTransactionAsync()
    {
        if (_transaction != null)
        {
            await _transaction.RollbackAsync();
            await _transaction.DisposeAsync();
            _transaction = null;
        }
    }

    public void Dispose()
    {
        _transaction?.Dispose();
        _context.Dispose();
    }
}

