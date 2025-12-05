using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using WebApp.Core.Entities;

namespace WebApp.Infrastructure.Data;

public class ApplicationDbContext : IdentityDbContext<User>
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<FileMetadata> Files { get; set; }
    public DbSet<Folder> Folders { get; set; }
    public DbSet<Content> Contents { get; set; }
    public DbSet<ContentFile> ContentFiles { get; set; }

    // RBAC
    public DbSet<Permission> Permissions { get; set; }
    public DbSet<RolePermission> RolePermissions { get; set; }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // FileMetadata configuration
        builder.Entity<FileMetadata>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.FileName).IsRequired().HasMaxLength(500);
            entity.Property(e => e.OriginalFileName).IsRequired().HasMaxLength(500);
            entity.Property(e => e.FilePath).IsRequired().HasMaxLength(1000);
            entity.Property(e => e.ContentType).IsRequired().HasMaxLength(100);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.FileType);

            entity.HasOne(e => e.Folder)
                .WithMany(f => f.Files)
                .HasForeignKey(e => e.FolderId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // Folder configuration
        builder.Entity<Folder>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(255);
            
            // Unique constraint: same name cannot exist in same parent folder for same user
            entity.HasIndex(e => new { e.UserId, e.ParentId, e.Name })
                .IsUnique()
                .HasFilter("[IsDeleted] = 0");

            entity.HasOne(e => e.Parent)
                .WithMany(f => f.Children)
                .HasForeignKey(e => e.ParentId)
                .OnDelete(DeleteBehavior.Restrict); // Use Restrict to avoid cascade path issues

            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.IsDeleted);
        });

        // Content configuration
        builder.Entity<Content>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(500);
            entity.Property(e => e.Slug).IsRequired().HasMaxLength(500);
            entity.HasIndex(e => e.Slug).IsUnique();
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.ContentType);
            entity.HasIndex(e => e.Status);
        });

        // ContentFile configuration
        builder.Entity<ContentFile>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Content)
                .WithMany(c => c.ContentFiles)
                .HasForeignKey(e => e.ContentId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.FileMetadata)
                .WithMany()
                .HasForeignKey(e => e.FileMetadataId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // Permission configuration
        builder.Entity<Permission>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Code).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Module).HasMaxLength(100);
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.HasIndex(e => e.Code).IsUnique();
        });

        // RolePermission configuration
        builder.Entity<RolePermission>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.RoleId).IsRequired();

            entity.HasIndex(e => new { e.RoleId, e.PermissionId }).IsUnique();

            entity.HasOne(e => e.Permission)
                .WithMany()
                .HasForeignKey(e => e.PermissionId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}



