using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebApp.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddVideoConversionJobs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "VideoConversionJobs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FileId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    Progress = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    OriginalFilePath = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ConvertedFilePath = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ErrorMessage = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    StartedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    VideoCodec = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AudioCodec = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    VideoBitrate = table.Column<int>(type: "int", nullable: true),
                    AudioBitrate = table.Column<int>(type: "int", nullable: true),
                    Resolution = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    FrameRate = table.Column<int>(type: "int", nullable: true),
                    Preset = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VideoConversionJobs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VideoConversionJobs_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_VideoConversionJobs_Files_FileId",
                        column: x => x.FileId,
                        principalTable: "Files",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_VideoConversionJobs_CreatedAt",
                table: "VideoConversionJobs",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_VideoConversionJobs_FileId",
                table: "VideoConversionJobs",
                column: "FileId");

            migrationBuilder.CreateIndex(
                name: "IX_VideoConversionJobs_Status",
                table: "VideoConversionJobs",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_VideoConversionJobs_UserId",
                table: "VideoConversionJobs",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "VideoConversionJobs");
        }
    }
}
