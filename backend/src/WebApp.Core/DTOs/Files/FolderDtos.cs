namespace WebApp.Core.DTOs.Files;

public class FolderDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public Guid? ParentId { get; set; }
    public IList<FolderDto> Children { get; set; } = new List<FolderDto>();
}

public class CreateFolderDto
{
    public string Name { get; set; } = string.Empty;
    public Guid? ParentId { get; set; }
}

public class UpdateFolderDto
{
    public string Name { get; set; } = string.Empty;
    public Guid? ParentId { get; set; }
}

public class MoveFileDto
{
    public Guid? FolderId { get; set; }
}


